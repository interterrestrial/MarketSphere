import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** ESLint flat config for MarketSphere (Next.js + TypeScript). */
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "dist/**", "next-env.d.ts"],
  },
  {
    // Electron's main process and the build hooks run in Node.js, not the
    // browser/bundler — `require()` is the correct module style there.
    files: ["electron/**/*.js", "packaging/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Generated bundle: not ours to lint or reformat.
    ignores: ["electron/dist/**"],
  },
];

export default config;
