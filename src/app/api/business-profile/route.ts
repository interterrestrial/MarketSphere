import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-response";
import type { ApiErrorBody } from "@/lib/api-response";
import { zodFieldDetails } from "@/lib/validation";
import { AppError } from "@/server/middleware/error-handler";
import {
  createProfile,
  getOwnProfile,
  updateProfile,
} from "@/server/services/business-profile.service";
import {
  createProfileSchema,
  updateProfileSchema,
  type ProfileRole,
} from "@/server/validators/business-profile";
import type { AuthUser } from "@/types/auth";
import { currentUser } from "../auth/_helpers";

/**
 * Same-origin business-profile endpoints for the browser UI, mirroring the
 * Express router and reusing the same service, schemas, and envelope.
 */

type ProfileResult = Awaited<ReturnType<typeof getOwnProfile>>;

async function sessionUser(): Promise<AuthUser | null> {
  return currentUser((await headers()).get("cookie"));
}

function jsonError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(fail(code, message, details), { status });
}

function unauthorized() {
  return jsonError("UNAUTHENTICATED", "Sign in to access this resource.", 401);
}

function adminsHaveNoProfile() {
  return jsonError(
    "ROLE_NOT_ALLOWED",
    "Administrator accounts do not have a business profile.",
    400
  );
}

/** Maps thrown errors (including malformed JSON) to the standard envelope. */
function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return jsonError(error.code, error.message, error.statusCode, error.details);
  }
  if (error instanceof SyntaxError) {
    return jsonError("BAD_JSON", "The request body is not valid JSON.", 400);
  }
  return jsonError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}

function validationResponse(details: unknown): NextResponse {
  const body: ApiErrorBody = {
    success: false,
    error: { code: "VALIDATION_ERROR", message: "The request contains invalid fields.", details },
  };
  return NextResponse.json(body, { status: 400 });
}

/** GET /api/business-profile — own profile + onboarding progress, or null. */
export async function GET(): Promise<NextResponse> {
  const user = await sessionUser();
  if (!user) return unauthorized();
  if (user.role === "ADMIN") return adminsHaveNoProfile();
  const result: ProfileResult = await getOwnProfile(user);
  return NextResponse.json(ok(result ?? { profile: null, onboarding: null }), { status: 200 });
}

/** POST /api/business-profile — create this account's single profile. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    if (!user) return unauthorized();
    if (user.role === "ADMIN") return adminsHaveNoProfile();
    const parsed = createProfileSchema(user.role as ProfileRole).safeParse(await request.json());
    if (!parsed.success) return validationResponse(zodFieldDetails(parsed.error));
    return NextResponse.json(ok(await createProfile(user, parsed.data)), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** PATCH /api/business-profile — update this account's own profile. */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const user = await sessionUser();
    if (!user) return unauthorized();
    if (user.role === "ADMIN") return adminsHaveNoProfile();
    const parsed = updateProfileSchema(user.role as ProfileRole).safeParse(await request.json());
    if (!parsed.success) return validationResponse(zodFieldDetails(parsed.error));
    return NextResponse.json(ok(await updateProfile(user, parsed.data)), { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
