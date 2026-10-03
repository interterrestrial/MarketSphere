import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/server/middleware/error-handler";
import { requireAdmin } from "@/server/services/admin-core";
import type { AuthUser } from "@/types/auth";
import { currentUser } from "@/app/api/auth/_helpers";

/**
 * Shared guards for the same-origin admin endpoints. Authorization is enforced
 * here in the backend via `requireAdmin`, not by hiding links in the UI.
 */

export async function sessionUser(): Promise<AuthUser | null> {
  return currentUser((await headers()).get("cookie"));
}

/** Returns the admin, or the error response to send instead. */
export async function requireAdminUser(): Promise<
  { user: AuthUser; denied: null } | { user: null; denied: NextResponse }
> {
  const user = await sessionUser();
  try {
    return { user: requireAdmin(user), denied: null };
  } catch (error) {
    if (error instanceof AppError) {
      return {
        user: null,
        denied: NextResponse.json(fail(error.code, error.message, error.details), {
          status: error.statusCode,
        }),
      };
    }
    return {
      user: null,
      denied: NextResponse.json(fail("INTERNAL_ERROR", "An unexpected error occurred."), {
        status: 500,
      }),
    };
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(fail(error.code, error.message, error.details), {
      status: error.statusCode,
    });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json(fail("BAD_JSON", "The request body is not valid JSON."), {
      status: 400,
    });
  }
  return NextResponse.json(fail("INTERNAL_ERROR", "An unexpected error occurred."), {
    status: 500,
  });
}

export function success(data: unknown, status = 200) {
  return NextResponse.json(ok(data), { status });
}

/** Optional `{ note }` body for decision endpoints. */
export async function readNote(request: Request): Promise<string | undefined> {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const note = (body as { note?: unknown }).note;
  return typeof note === "string" && note.trim() !== "" ? note.trim() : undefined;
}
