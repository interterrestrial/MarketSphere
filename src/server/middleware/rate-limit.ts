import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error-handler";

/**
 * Minimal in-memory rate limiter for abuse-prone endpoints (login/register).
 * Per-IP sliding window; sufficient for a single-instance MVP — replace with
 * a shared store (e.g. Redis) when running multiple instances.
 */
interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${req.ip ?? "unknown"}:${req.path}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      buckets.set(key, bucket);
    }
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);
    if (bucket.timestamps.length >= options.max) {
      next(new AppError(429, "RATE_LIMITED", "Too many attempts. Please try again later."));
      return;
    }
    bucket.timestamps.push(now);
    // Opportunistic cleanup so the map cannot grow without bound.
    if (buckets.size > 10_000) buckets.clear();
    next();
  };
}

/** 20 attempts per 10 minutes per IP — applied to login and registration. */
export const authRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 20 });
