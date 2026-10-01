import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "./error-handler";

/**
 * Input validation middleware (Task 3, BR-11: validate on the server).
 *
 * Pass zod schemas for any of body/query/params. Each present schema is
 * parsed strictly; parsed values replace the originals so downstream code
 * only ever sees validated, correctly-typed data.
 *
 * On failure the request short-circuits with 400 VALIDATION_ERROR and
 * field-level details: [{ path: "quantity", message: "Expected number" }].
 */
interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as Request["query"];
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request["params"];
      }
      next();
    } catch (error) {
      next(toValidationError(error));
    }
  };
}

function toValidationError(error: unknown): ValidationError {
  if (typeof error === "object" && error !== null && "issues" in error) {
    const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> })
      .issues;
    return new ValidationError(
      "The request contains invalid fields.",
      issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }))
    );
  }
  return new ValidationError("The request contains invalid fields.");
}
