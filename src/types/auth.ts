import type { AccountStatus, UserRole } from "@prisma/client";

/**
 * Public auth-facing user shape. Never includes passwordHash — service
 * functions must map through `toPublicUser` before returning.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimal claims embedded in the session JWT. */
export interface SessionPayload {
  sub: string;
  role: UserRole;
}
