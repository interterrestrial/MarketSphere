import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { hashPassword, verifyPassword } from "../../lib/password";
import type { AuthUser } from "../../types/auth";
import { AppError } from "../middleware/error-handler";
import type { LoginInput, RegisterInput } from "../validators/auth";

type UserRow = Prisma.UserGetPayload<true>;

/** Strips credentials; every auth response must go through this. */
export function toPublicUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Registers a buyer or seller.
 * - Buyers become ACTIVE immediately (no buyer verification in the MVP).
 * - Sellers start PENDING until an administrator approves them (FR-09).
 */
export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "CONFLICT", "An account with this email already exists.");
  }
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      status: input.role === "SELLER" ? "PENDING" : "ACTIVE",
    },
  });
  return toPublicUser(user);
}

/**
 * Validates credentials and account status. Sellers pending approval and
 * suspended/rejected accounts are refused with explicit codes so the UI
 * can explain the state instead of showing a generic failure.
 */
export async function authenticateUser(input: LoginInput): Promise<AuthUser> {
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  switch (user.status) {
    case "ACTIVE":
      return toPublicUser(user);
    case "PENDING":
      // Sellers sign in while their account is still under review so they can
      // complete onboarding (Phase 3). Everything except onboarding stays
      // closed via `requireActiveAccount`; BR-02 keeps publishing blocked.
      return toPublicUser(user);
    default:
      throw new AppError(
        403,
        "ACCOUNT_INACTIVE",
        "This account is no longer active. Contact support for help."
      );
  }
}

/**
 * Loads the session owner for authenticated requests. Returns null when the
 * account is gone, rejected, or suspended — every API call re-reads status,
 * so suspension takes effect immediately (no token revocation needed).
 * PENDING sellers are returned; business routes gate them separately.
 */
export async function getActiveSessionUser(id: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user || user.status === "REJECTED" || user.status === "SUSPENDED") return null;
  return toPublicUser(user);
}
