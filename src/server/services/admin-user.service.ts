import type { AccountStatus, Prisma, UserRole } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import { AppError } from "../middleware/error-handler";
import { ADMIN_ACTIONS, AUDIT_ENTITIES, recordAudit } from "./admin-core";
import { notify } from "./notification.service";

/**
 * User management (FR-43): review accounts and suspend or reinstate them.
 * Administrators are exempt from suspension so the platform cannot be left
 * without an operator.
 */

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: AccountStatus;
  businessName: string | null;
  productCount: number;
  requestCount: number;
  createdAt: string;
}

type UserRow = Prisma.UserGetPayload<{
  include: {
    businessProfile: { select: { businessName: true } };
    _count: { select: { products: true; buyerRequests: true } };
  };
}>;

function toRow(user: UserRow): AdminUserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    businessName: user.businessProfile?.businessName ?? null,
    productCount: user._count.products,
    requestCount: user._count.buyerRequests,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Accounts for the user list, filtered by role and/or status. */
export async function listUsers(options: {
  role?: UserRole;
  status?: AccountStatus;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminUserRow[]; total: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const where: Prisma.UserWhereInput = {
    ...(options.role ? { role: options.role } : {}),
    ...(options.status ? { status: options.status } : {}),
  };

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        businessProfile: { select: { businessName: true } },
        _count: { select: { products: true, buyerRequests: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return { items: rows.map(toRow), total };
}

/**
 * Suspends or reactivates any buyer or seller account (FR-43). Status is
 * re-read on every authenticated request, so a suspension takes effect on the
 * account's very next request without touching its session token.
 */
export async function setUserAccountStatus(
  admin: AuthUser,
  userId: string,
  status: "suspend" | "reactivate",
  note?: string
): Promise<AdminUserRow> {
  const target = await db.user.findUnique({
    where: { id: userId },
    include: {
      businessProfile: { select: { businessName: true } },
      _count: { select: { products: true, buyerRequests: true } },
    },
  });
  if (!target) {
    throw new AppError(404, "NOT_FOUND", "User not found.");
  }
  if (target.role === "ADMIN") {
    throw new AppError(
      403,
      "ROLE_FORBIDDEN",
      "Administrator accounts cannot be suspended from this screen."
    );
  }
  const suspending = status === "suspend";
  if (suspending && target.status === "SUSPENDED") {
    throw new AppError(409, "ALREADY_SUSPENDED", "This account is already suspended.");
  }
  if (!suspending && target.status !== "SUSPENDED") {
    throw new AppError(409, "NOT_SUSPENDED", "This account is not suspended.");
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { status: suspending ? "SUSPENDED" : "ACTIVE" },
    include: {
      businessProfile: { select: { businessName: true } },
      _count: { select: { products: true, buyerRequests: true } },
    },
  });

  // A suspended seller's live listings stop appearing in buyer search (BR-03).
  if (suspending && target.role === "SELLER") {
    await db.product.updateMany({
      where: { sellerId: userId, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  await recordAudit({
    actorId: admin.id,
    action: suspending ? ADMIN_ACTIONS.USER_SUSPENDED : ADMIN_ACTIONS.USER_REACTIVATED,
    entityType: AUDIT_ENTITIES.USER,
    entityId: userId,
    note: note?.trim() ?? null,
  });

  await notify({
    userId,
    type: "ACCOUNT_UPDATE",
    title: suspending ? "Your account is suspended" : "Your account is active again",
    message: suspending
      ? `You cannot sign in or trade while suspended.${note ? ` Reason: ${note.trim()}` : ""} Contact support if you think this is a mistake.`
      : "You can sign in and use MarketSphere again.",
  });

  return toRow(updated);
}
