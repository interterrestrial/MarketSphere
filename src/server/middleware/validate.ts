import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { zodFieldDetails } from "../../lib/validation";
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
  return (req: Request, res: Response, next: NextFunction): void => {
    runValidation(req, schemas);
    next();
  };
}

/**
 * Same as `validate`, but resolves the schemas per request — required when
 * the rules depend on the signed-in user (e.g. role-scoped business types).
 */
export function validateDynamic(resolve: (req: Request) => Schemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    runValidation(req, resolve(req));
    next();
  };
}

function runValidation(req: Request, schemas: Schemas): void {
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
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("The request contains invalid fields.", zodFieldDetails(error));
  }
}
