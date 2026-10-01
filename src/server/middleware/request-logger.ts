import type { NextFunction, Request, Response } from "express";
import { logger } from "../../lib/logger";

/**
 * Request logging middleware (Task 3).
 * Emits one line per request on completion: METHOD path -> STATUS duration.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - started;
    logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs}ms`);
  });
  next();
}
