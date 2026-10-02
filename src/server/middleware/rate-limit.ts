import type { NextFunction, Request, Response } from "express";
import { AUTH_RATE_LIMIT, isRateLimited } from "../../lib/rate-limit";
import { AppError } from "./error-handler";

/**
 * Rate limiter for abuse-prone Express endpoints (login/register).
 * Keyed per client IP + route path.
 */
export function rateLimit(keyPrefix = "") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${keyPrefix}${req.ip ?? "unknown"}:${req.path}`;
    if (isRateLimited(key, AUTH_RATE_LIMIT.windowMs, AUTH_RATE_LIMIT.max)) {
      next(new AppError(429, "RATE_LIMITED", "Too many attempts. Please try again later."));
      return;
    }
    next();
  };
}

/** 20 attempts per 10 minutes per IP — applied to login and registration. */
export const authRateLimit = rateLimit("express:auth:");
