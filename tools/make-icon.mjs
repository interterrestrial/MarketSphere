/**
 * Generates the macOS application icon.
 *
 * The shell ships without binary art in the repository, so the icon is drawn
 * from the same design tokens the web app uses and rasterised here — no image
 * dependency required. A minimal PNG encoder (zlib is built into Node) writes
 * each size, and macOS `iconutil` assembles them into the `.icns` bundle.
 *
 * Run: npm run electron:icon
 */
import { deflateSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const buildDir = join(repoRoot, "packaging");

// From tailwind.config.ts / globals.css.
const PRIMARY = [0x1b, 0x6a, 0xa8];
const PRIMARY_STRONG = [0x14, 0x56, 0x85];
const ON_PRIMARY = [0xff, 0xff, 0xff];

/** PNG sizes macOS expects inside an .icns, mapped to their iconutil name. */
const SIZES = [
  [16, "icon_16x16"],
  [32, "icon_32x32"],
  [64, "icon_32x32@2x"],
  [128, "icon_128x128"],
  [256, "icon_128x128@2x"],
  [512, "icon_256x256@2x"],
  [1024, "icon_512x512@2x"],
];

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Encode RGBA pixel data (width * height * 4) as a PNG. */
function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  // 10..12: compression, filter, interlace — all zero.

  // Each scanline is prefixed with filter type 0 (none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Signed distance to a rounded rectangle, used for clean edges with
 * antialiasing. Coordinates are normalised so the canvas spans [-1, 1].
 */
function roundedRectDistance(px, py, halfWidth, halfHeight, radius) {
  const qx = Math.abs(px) - halfWidth + radius;
  const qy = Math.abs(py) - halfHeight + radius;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}

/** Antialiased coverage from a distance field: 1 inside, 0 outside. */
function coverage(distance, pixel) {
  return Math.min(Math.max(0.5 - distance / pixel, 0), 1);
}

function blend(base, colour, alpha) {
  return [
    Math.round(base[0] * (1 - alpha) + colour[0] * alpha),
    Math.round(base[1] * (1 - alpha) + colour[1] * alpha),
    Math.round(base[2] * (1 - alpha) + colour[2] * alpha),
  ];
}

/**
 * The mark: a brand-blue squircle carrying a white listing card with two
 * lines. Proportions are chosen so it still reads at 16px, where detail
 * disappears and only the silhouette survives.
 */
function drawPixel(x, y, size) {
  const pixel = 2 / size;
  const u = ((x + 0.5) / size) * 2 - 1;
  const v = ((y + 0.5) / size) * 2 - 1;

  const plate = coverage(roundedRectDistance(u, v, 0.92, 0.92, 0.4), pixel);
  if (plate <= 0) return [0, 0, 0, 0];

  // Diagonal gradient across the plate, matching the web app's primary ramp.
  const mix = (u + v + 2) / 4;
  let colour = PRIMARY.map((c, i) => Math.round(c + (PRIMARY_STRONG[i] - c) * mix * 0.5));

  const card = coverage(roundedRectDistance(u, v - 0.02, 0.46, 0.3, 0.1), pixel);
  colour = blend(colour, ON_PRIMARY, card);

  if (card > 0) {
    for (const offset of [-0.13, 0.13]) {
      const bar = coverage(roundedRectDistance(u, v - offset - 0.02, 0.3, 0.055, 0.04), pixel);
      colour = blend(colour, PRIMARY, bar * card);
    }
  }

  return [...colour, Math.round(plate * 255)];
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = drawPixel(x, y, size);
      const offset = (y * size + x) * 4;
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = a;
    }
  }
  return encodePng(size, size, rgba);
}

const workDir = mkdtempSync(join(tmpdir(), "marketsphere-icon-"));
try {
  const iconset = join(workDir, "icon.iconset");
  execFileSync("mkdir", ["-p", iconset]);

  for (const [size, name] of SIZES) {
    writeFileSync(join(iconset, `${name}.png`), render(size));
  }

  const icnsPath = join(buildDir, "icon.icns");
  execFileSync("iconutil", ["-c", "icns", iconset, "-o", icnsPath]);
  console.log(`Wrote ${icnsPath}`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
