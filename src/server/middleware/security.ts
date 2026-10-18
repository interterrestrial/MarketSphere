import type { NextFunction, Request, Response } from "express";

/**
 * Baseline response headers for the JSON API.
 *
 * The API only ever returns JSON, so these are cheap and remove whole classes
 * of problems: MIME sniffing, framing, referrer leakage and (in production)
 * downgrade attacks. The browser-facing app sets its own stricter set,
 * including a Content-Security-Policy, in next.config.ts.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // The API serves JSON only; nothing should ever be framed or sniffed as HTML.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );
  res.removeHeader("X-Powered-By");

  if (process.env["NODE_ENV"] === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}
