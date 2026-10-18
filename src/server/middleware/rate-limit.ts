import type { NextFunction, Request, Response } from "express";
import { API_RATE_LIMIT, AUTH_RATE_LIMIT, isRateLimited } from "../../lib/rate-limit";
import { AppError } from "./error-handler";

/**
 * Rate limiter for abuse-prone endpoints. Keyed per client IP + route path, so
 * one noisy route cannot consume another route's budget.
 */
export function rateLimit(keyPrefix: string, limits = AUTH_RATE_LIMIT) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${keyPrefix}${req.ip ?? "unknown"}:${req.path}`;
    if (isRateLimited(key, limits.windowMs, limits.max)) {
      next(new AppError(429, "RATE_LIMITED", "Too many attempts. Please try again later."));
      return;
    }
    next();
  };
}

/** 20 attempts per 10 minutes per IP — applied to login and registration. */
export const authRateLimit = rateLimit("express:auth:");

/** 300 requests per minute per IP — applied to the whole business API. */
export const apiRateLimit = rateLimit("express:api:", API_RATE_LIMIT);
