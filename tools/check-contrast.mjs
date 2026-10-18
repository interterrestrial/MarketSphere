/**
 * WCAG contrast guard for the MarketSphere palette.
 *
 * Reads the real token values from src/app/globals.css so the check can never
 * drift from what ships, then verifies the foreground/background pairs the UI
 * actually uses (Design.md §10: verify contrast, do not assume).
 *
 * Run with: npm run check:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

/** Pulls `--color-name: #hex;` declarations out of :root. */
function tokens() {
  const found = new Map();
  for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    found.set(match[1], match[2]);
  }
  return found;
}

const t = tokens();
const color = (name) => {
  const value = t.get(name);
  if (!value) throw new Error(`Missing --color-${name} in globals.css`);
  return value;
};

const channel = (hex) => {
  const v = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
};
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = channel(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Minimum 4.5 for body text, 3 for large text and UI boundaries. */
const TEXT = 4.5;
const UI = 3;

const pairs = [
  ["body text on canvas", "text", "bg", TEXT],
  ["body text on surface", "text", "surface", TEXT],
  ["secondary text on canvas", "text-secondary", "bg", TEXT],
  ["secondary text on surface", "text-secondary", "surface", TEXT],
  ["muted text on canvas", "text-muted", "bg", TEXT],
  ["muted text on surface", "text-muted", "surface", TEXT],
  ["label on primary fill", "on-primary", "primary", TEXT],
  ["label on danger fill", "on-primary", "danger", TEXT],
  ["link on canvas", "primary", "bg", TEXT],
  ["link on surface", "primary", "surface", TEXT],
  ["success text on surface", "success", "surface", TEXT],
  ["warning text on surface", "warning", "surface", TEXT],
  ["danger text on surface", "danger", "surface", TEXT],
  ["info text on surface", "info", "surface", TEXT],
  ["focus ring on canvas", "primary", "bg", UI],
  ["focus ring on surface", "primary", "surface", UI],
  ["border visible on canvas", "border", "bg", 1.05],
];

let failures = 0;
for (const [label, fg, bg, min] of pairs) {
  const ratio = contrast(color(fg), color(bg));
  const ok = ratio >= min;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${ratio.toFixed(2).padStart(6)}:1  min ${min}  ${label}`);
}

if (failures > 0) {
  console.error(`\n${failures} contrast check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${pairs.length} contrast checks passed.`);
