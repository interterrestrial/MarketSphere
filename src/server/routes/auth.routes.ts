import { Router, type Request, type Response } from "express";
import { ok } from "../../lib/api-response";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "../../lib/session";
import { authenticate } from "../middleware/require-auth";
import { asyncHandler } from "../middleware/error-handler";
import { authRateLimit } from "../middleware/rate-limit";
import { validate } from "../middleware/validate";
import { authenticateUser, registerUser } from "../services/auth.service";
import { loginSchema, registerSchema } from "../validators/auth";

export const authRouter = Router();

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

/**
 * POST /api/v1/auth/register — buyer/seller self-registration.
 * Sellers start PENDING (admin approval); buyers start ACTIVE.
 */
authRouter.post(
  "/register",
  authRateLimit,
  validate({ body: registerSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await registerUser(req.body);
    setSessionCookie(res, await signSession({ sub: user.id, role: user.role }));
    res.status(201).json(ok({ user }));
  })
);

/**
 * POST /api/v1/auth/login — credential check + session cookie.
 * Non-ACTIVE accounts are refused with explicit codes (ACCOUNT_PENDING, …).
 */
authRouter.post(
  "/login",
  authRateLimit,
  validate({ body: loginSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authenticateUser(req.body);
    setSessionCookie(res, await signSession({ sub: user.id, role: user.role }));
    res.status(200).json(ok({ user }));
  })
);

/** POST /api/v1/auth/logout — clears the session cookie. */
authRouter.post("/logout", (_req: Request, res: Response) => {
  const options = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: options.httpOnly,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
  });
  res.status(200).json(ok({ signedOut: true }));
});

/** GET /api/v1/auth/me — current session owner (proves the cookie works). */
authRouter.get("/me", authenticate, (req: Request, res: Response) => {
  res.status(200).json(ok({ user: req.user }));
});
