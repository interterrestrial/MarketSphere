import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { SESSION_COOKIE, verifySession } from "../../lib/session";
import type { AuthUser } from "../../types/auth";
import { getActiveSessionUser } from "../services/auth.service";
import { AppError, asyncHandler } from "./error-handler";

declare global {
  // Attaches the authenticated user to Express requests after `authenticate`.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Reads the session cookie without depending on cookie-parser. */
function readSessionCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

/**
 * Authentication middleware — the backend enforcement point.
 * Verifies the session JWT, reloads the user from the database, and refuses
 * non-ACTIVE accounts. Handlers after this middleware can trust `req.user`.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = readSessionCookie(req);
    if (!token) {
      throw new AppError(401, "UNAUTHENTICATED", "Sign in to access this resource.");
    }
    const session = await verifySession(token);
    if (!session) {
      throw new AppError(401, "UNAUTHENTICATED", "Your session has expired. Sign in again.");
    }
    const user = await getActiveSessionUser(session.sub);
    if (!user) {
      throw new AppError(403, "ACCOUNT_INACTIVE", "This account is no longer active.");
    }
    req.user = user;
    next();
  }
);

/**
 * Role-based authorization. Must always run after `authenticate`:
 * `router.get("/x", authenticate, requireRole("SELLER"), handler)`.
 */
export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "UNAUTHENTICATED", "Sign in to access this resource."));
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(new AppError(403, "ROLE_FORBIDDEN", "Your account type cannot access this resource."));
      return;
    }
    next();
  };
}
