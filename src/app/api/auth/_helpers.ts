import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { AUTH_RATE_LIMIT, isRateLimited } from "@/lib/rate-limit";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "@/lib/session";
import type { AuthUser } from "@/types/auth";
import { AppError } from "@/server/middleware/error-handler";
import { getActiveSessionUser } from "@/server/services/auth.service";

/** Maps service errors to envelope responses; never leaks internals. */
export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(fail(error.code, error.message, error.details), {
      status: error.statusCode,
    });
  }
  return NextResponse.json(fail("INTERNAL_ERROR", "An unexpected error occurred."), {
    status: 500,
  });
}

/** Builds `ok({ user })` and attaches the session cookie. */
export async function sessionResponse(user: AuthUser, status: number): Promise<NextResponse> {
  const token = await signSession({ sub: user.id, role: user.role });
  const res = NextResponse.json(ok({ user }), { status });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

/** Resolves the session cookie to an ACTIVE user, or null. */
export async function currentUser(cookieHeader: string | null): Promise<AuthUser | null> {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === SESSION_COOKIE) {
      const session = await verifySession(decodeURIComponent(part.slice(index + 1).trim()));
      if (!session) return null;
      return getActiveSessionUser(session.sub);
    }
  }
  return null;
}

/** Client IP for rate limiting (works behind proxies and locally). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function authRateLimited(request: Request, scope: string): boolean {
  return isRateLimited(
    `next:auth:${scope}:${clientIp(request)}`,
    AUTH_RATE_LIMIT.windowMs,
    AUTH_RATE_LIMIT.max
  );
}
