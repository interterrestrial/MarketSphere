import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { zodFieldDetails } from "@/lib/validation";
import { AppError } from "@/server/middleware/error-handler";
import type { AuthUser } from "@/types/auth";
import { currentUser } from "@/app/api/auth/_helpers";

/**
 * Shared guards and error mapping for the same-origin product endpoints.
 * The Express router in src/server/routes/product.routes.ts is the
 * equivalent API surface; both call the same product services.
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

/** Seller-only endpoints: any SELLER account may manage its own drafts. */
export function requireSeller(user: AuthUser | null): NextResponse | null {
  if (!user) return unauthorized();
  if (user.role !== "SELLER") {
    return jsonError("ROLE_FORBIDDEN", "Only seller accounts manage products.", 403);
  }
  return null;
}

/**
 * Submitting a listing for publication additionally requires an ACTIVE
 * account (BR-02) — pending sellers may prepare drafts but not publish.
 */
export function requireActiveSeller(user: AuthUser | null): NextResponse | null {
  const denied = requireSeller(user);
  if (denied) return denied;
  if (user!.status !== "ACTIVE") {
    return jsonError(
      "ACCOUNT_PENDING",
      "Your account is awaiting approval. You can prepare listings but not submit them for review yet.",
      403
    );
  }
  return null;
}

export function success(data: unknown, status = 200) {
  return NextResponse.json(ok(data), { status });
}

export { zodFieldDetails };
