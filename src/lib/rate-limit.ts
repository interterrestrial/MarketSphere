/**
 * Framework-agnostic sliding-window rate limiter (in-memory).
 * Single-instance MVP scope — see server middleware / Next handlers for use.
 */

const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, windowMs: number, max: number): boolean {
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

/** Shared auth-attempt budget: 20 tries per 10 minutes per client. */
export const AUTH_RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 20 };
