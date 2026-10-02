import { NextResponse } from "next/server";
import { ok } from "@/lib/api-response";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/** POST /api/auth/logout — clears the session cookie. */
export async function POST(): Promise<NextResponse> {
  const options = sessionCookieOptions();
  const res = NextResponse.json(ok({ signedOut: true }), { status: 200 });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
    maxAge: 0,
  });
  return res;
}
