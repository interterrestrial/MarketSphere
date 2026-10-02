import { env } from "./env";
import type { SessionPayload } from "../types/auth";

/**
 * Stateless JWT session handling, shared by the Express API and Next.js
 * route handlers / middleware.
 *
 * - `jose` is imported dynamically so this module also loads under ts-node
 *   (CommonJS), which cannot statically require ESM-only packages.
 * - Tokens carry only `{ sub, role }`; account status is re-checked against
 *   the database on every authenticated API request (see `authenticate`
 *   middleware), so suspension takes effect without token revocation lists.
 */
export const SESSION_COOKIE = "ms_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

async function secretKey(): Promise<Uint8Array> {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const { SignJWT } = await import("jose");
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(await secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, await secretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload["role"] !== "string") {
      return null;
    }
    return { sub: payload.sub, role: payload["role"] as SessionPayload["role"] };
  } catch {
    return null;
  }
}

export interface SessionCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
}

/**
 * Cookie attributes both transports must use (prevents session fixation gaps).
 * `maxAge` is in **seconds**, matching the Next.js `cookies()` API.
 */
export function sessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Same attributes for Express `res.cookie`, whose `maxAge` is in
 * **milliseconds** — passing seconds here would silently shorten sessions
 * (604800ms ≈ 10 minutes instead of 7 days).
 */
export function expressSessionCookieOptions(): SessionCookieOptions {
  return { ...sessionCookieOptions(), maxAge: SESSION_MAX_AGE_SECONDS * 1000 };
}
