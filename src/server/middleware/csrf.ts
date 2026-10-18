import type { NextFunction, Request, Response } from "express";
import { env } from "../../lib/env";
import { AppError } from "./error-handler";

/**
 * Origin check for state-changing API calls.
 *
 * Sessions live in a cookie, so any site could try to make a signed-in
 * browser send a request on the user's behalf. `SameSite=Lax` already blocks
 * the common cases; this is the second layer:
 *
 *   - Safe methods are never checked.
 *   - A request carrying `Origin` must match an allowed origin exactly.
 *   - Without `Origin`, a `Referer` is used if present.
 *   - Neither header means a non-browser client (curl, server-to-server,
 *     the test suite), which cannot be driven by a third-party page.
 *
 * Note that a browser always attaches `Origin` to cross-origin POST/PUT/PATCH
 * /DELETE requests, so the "neither header" case is not attacker-reachable
 * from a page.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Origins that may send state-changing requests with a session cookie. */
function allowedOrigins(): Set<string> {
  const configured = (process.env["CSRF_ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([env.NEXT_PUBLIC_APP_URL, "http://localhost:3000", ...configured]);
}

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // `Origin` wins; `Referer` is the fallback for browsers that omit it.
  const raw = req.get("origin") ?? req.get("referer");
  if (raw === undefined) {
    // No header at all: a non-browser client, which no page can drive.
    next();
    return;
  }

  // A header that is present but unparseable is rejected rather than ignored,
  // otherwise a malformed value would silently skip the check.
  const origin = originOf(raw);
  if (origin === null || !allowedOrigins().has(origin)) {
    next(new AppError(403, "ORIGIN_REJECTED", "This request came from an untrusted origin."));
    return;
  }
  next();
}
