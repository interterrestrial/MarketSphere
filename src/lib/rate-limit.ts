/**
 * Framework-agnostic sliding-window rate limiter (in-memory).
 * Single-instance MVP scope — see server middleware / Next handlers for use.
 */

const buckets = new Map<string, number[]>();

/**
 * Whether limits are enforced at all.
 *
 * Automated tests need to make many authenticated calls from one address,
 * which would otherwise trip the shared limiter. The bypass is read from the
 * environment and is refused in production, so it can never be used to
 * switch protection off on a live deployment.
 */
export function rateLimitingEnabled(): boolean {
  // Read from `process.env` rather than the `env` snapshot: this is a
  // runtime safety check, and it must reflect the environment as it is now.
  if (process.env["NODE_ENV"] === "production") return true;
  return process.env["RATE_LIMIT_DISABLED"] !== "true";
}

export function isRateLimited(key: string, windowMs: number, max: number): boolean {
  if (!rateLimitingEnabled()) return false;
  const now = Date.now();
  let timestamps = buckets.get(key);
  if (!timestamps) {
    timestamps = [];
    buckets.set(key, timestamps);
  }
  const fresh = timestamps.filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    buckets.set(key, fresh);
    return true;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  if (buckets.size > 10_000) buckets.clear();
  return false;
}

/**
 * Clears every bucket. Used by the test suite so one test's traffic cannot
 * throttle the next one.
 */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Shared auth-attempt budget: 20 tries per 10 minutes per client. */
export const AUTH_RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 20 };

/** Broad budget for the rest of the API: 300 requests per minute per client. */
export const API_RATE_LIMIT = { windowMs: 60 * 1000, max: 300 };
