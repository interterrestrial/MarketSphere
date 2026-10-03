import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fail, ok, paginated } from "@/lib/api-response";
import { zodFieldDetails } from "@/lib/validation";
import { AppError } from "@/server/middleware/error-handler";
import type { AuthUser } from "@/types/auth";
import { currentUser } from "@/app/api/auth/_helpers";
import type { OrderRequestDto } from "@/types/order";

/**
 * Shared guards for the same-origin order endpoints. Mirrors the Express
 * router in src/server/routes/order.routes.ts and calls the same services.
 */

export async function sessionUser(): Promise<AuthUser | null> {
  return currentUser((await headers()).get("cookie"));
}

export function jsonError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(fail(code, message, details), { status });
}

export function unauthorized() {
  return jsonError("UNAUTHENTICATED", "Sign in to access this resource.", 401);
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return jsonError(error.code, error.message, error.statusCode, error.details);
  }
  if (error instanceof SyntaxError) {
    return jsonError("BAD_JSON", "The request body is not valid JSON.", 400);
  }
  return jsonError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}

export function validationError(details: unknown): NextResponse {
  return jsonError("VALIDATION_ERROR", "The request contains invalid fields.", 400, details);
}

/** Order actions are limited to the two parties; no admin actions in the MVP. */
export function requireParty(user: AuthUser | null): NextResponse | null {
  if (!user) return unauthorized();
  if (user.role !== "BUYER" && user.role !== "SELLER") {
    return jsonError("ROLE_FORBIDDEN", "Your account type cannot manage order requests.", 403);
  }
  return null;
}

export function requireBuyer(user: AuthUser | null): NextResponse | null {
  if (!user) return unauthorized();
  if (user.role !== "BUYER") {
    return jsonError("ROLE_FORBIDDEN", "Only buyer accounts can submit order requests.", 403);
  }
  return null;
}

export function orderResponse(order: OrderRequestDto, status = 200) {
  return NextResponse.json(ok(order), { status });
}

export { paginated, zodFieldDetails };
