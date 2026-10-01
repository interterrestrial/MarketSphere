/**
 * Centralized environment variable handling for MarketSphere.
 *
 * - Validates required variables at startup so misconfiguration fails fast
 *   with a clear message instead of a cryptic runtime error.
 * - Provides typed defaults for optional variables.
 * - Works in both Next.js (which loads `.env` automatically) and the
 *   standalone Express server (which loads `.env` via `dotenv` in
 *   `src/server/index.ts` before importing this module).
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`[env] Expected ${name} to be an integer, got: ${raw}`);
  }
  return parsed;
}

export const env = {
  /** PostgreSQL connection string (required). */
  DATABASE_URL: required("DATABASE_URL"),

  /** Public URL of the Next.js app. */
  NEXT_PUBLIC_APP_URL: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  /** Port for the standalone Express API server. */
  PORT: optionalInt("PORT", 3001),

  /**
   * Secret used for authentication (sessions/tokens).
   * Required from Phase 1 (auth) onwards; Phase 0 boots without it
   * but warns so local setup is ready in advance.
   */
  AUTH_SECRET: process.env["AUTH_SECRET"] ?? "",

  /** Node environment. */
  NODE_ENV: optional("NODE_ENV", "development"),
} as const;

if (!env.AUTH_SECRET && env.NODE_ENV !== "test") {
  console.warn(
    "[env] AUTH_SECRET is not set. Authentication (Phase 1+) will require it. " +
      "Set it in .env — see .env.example."
  );
}
