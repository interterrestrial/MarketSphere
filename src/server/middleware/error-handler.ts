import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { fail } from "../../lib/api-response";
import { logger } from "../../lib/logger";

/**
 * Centralized error model (Task 3 + Task 4).
 *
 * Throw (or forward via `asyncHandler`) an AppError from any controller or
 * middleware and the error handler below turns it into a consistent
 * `{ success: false, error: { code, message, details } }` response with the
 * right HTTP status. Unknown errors become 500 INTERNAL_ERROR without
 * leaking internals to the client.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, "NOT_FOUND", `${resource} not found.`);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request.", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

/** Wraps async route handlers so rejections reach the error middleware (Express 4). */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

/** Maps well-known Prisma failures to HTTP semantics; returns null if unknown. */
function prismaToAppError(error: Prisma.PrismaClientKnownRequestError): AppError | null {
  switch (error.code) {
    case "P2002":
      return new AppError(409, "CONFLICT", "A record with these unique values already exists.");
    case "P2025":
      return new AppError(404, "NOT_FOUND", "The requested record was not found.");
    case "P2003":
      return new AppError(400, "INVALID_REFERENCE", "A referenced record does not exist.");
    default:
      return null;
  }
}

/** Final 404 for unmatched routes — keeps unknown paths in the same envelope. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(fail("NOT_FOUND", "The requested endpoint does not exist."));
}

// Express recognises error middleware by its 4-arity signature.
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Malformed JSON bodies (thrown by express.json()).
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json(fail("BAD_JSON", "The request body is not valid JSON."));
    return;
  }

  let appError: AppError;
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError =
      prismaToAppError(error) ??
      new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  } else {
    appError = new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }

  if (appError.statusCode >= 500) {
    logger.error(
      `${req.method} ${req.originalUrl} -> ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
    );
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${appError.code}: ${appError.message}`);
  }

  res.status(appError.statusCode).json(fail(appError.code, appError.message, appError.details));
}
