import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import { AppError } from "../middleware/error-handler";

/**
 * Shared administration plumbing: the backend guard, the audit trail (FR-46),
 * and the audit vocabulary.
 *
 * Administrators never negotiate commercial terms on anyone's behalf
 * (Use-Case-Diagram §5) — they decide account status, listing visibility, and
 * report outcomes, and every one of those decisions is recorded here.
 */

/** Stable action codes written to the audit log. */
export const ADMIN_ACTIONS = {
  SELLER_APPROVED: "SELLER_APPROVED",
  SELLER_REJECTED: "SELLER_REJECTED",
  SELLER_SUSPENDED: "SELLER_SUSPENDED",
  SELLER_REACTIVATED: "SELLER_REACTIVATED",
  PRODUCT_APPROVED: "PRODUCT_APPROVED",
  PRODUCT_REJECTED: "PRODUCT_REJECTED",
  PRODUCT_ARCHIVED: "PRODUCT_ARCHIVED",
  USER_SUSPENDED: "USER_SUSPENDED",
  USER_REACTIVATED: "USER_REACTIVATED",
  REPORT_RESOLVED: "REPORT_RESOLVED",
  REPORT_DISMISSED: "REPORT_DISMISSED",
} as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[keyof typeof ADMIN_ACTIONS];

/** Entity kinds an audit entry can point at. */
export const AUDIT_ENTITIES = {
  SELLER: "SELLER",
  USER: "USER",
  PRODUCT: "PRODUCT",
  REPORT: "REPORT",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITIES)[keyof typeof AUDIT_ENTITIES];

/**
 * The single backend enforcement point for administrative access (BR-01).
 * Called by every admin route before any work happens, so a hidden button can
 * never be the only thing standing between a buyer and the admin API.
 */
export function requireAdmin(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to access this resource.");
  }
  if (user.role !== "ADMIN") {
    throw new AppError(403, "ROLE_FORBIDDEN", "Administrator access is required for this action.");
  }
  if (user.status !== "ACTIVE") {
    throw new AppError(403, "ACCOUNT_INACTIVE", "This administrator account is not active.");
  }
  return user;
}

/** Records an administrative decision. Never throws into the caller's path. */
export async function recordAudit(entry: {
  actorId: string;
  action: AdminAction;
  entityType: AuditEntityType;
  entityId: string;
  note?: string | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        note: entry.note ?? null,
      },
    });
  } catch (error) {
    console.error(
      `[admin] audit write failed for ${entry.action}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export interface AuditEntryDto {
  id: string;
  action: AdminAction;
  entityType: AuditEntityType;
  entityId: string;
  note: string | null;
  actorName: string;
  createdAt: string;
}

/** Audit history, newest first (FR-46). */
export async function listAuditEntries(options: {
  page?: number;
  pageSize?: number;
  entityType?: AuditEntityType;
  entityId?: string;
}): Promise<{ items: AuditEntryDto[]; total: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const where = {
    ...(options.entityType ? { entityType: options.entityType } : {}),
    ...(options.entityId ? { entityId: options.entityId } : {}),
  };

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action as AdminAction,
      entityType: row.entityType as AuditEntityType,
      entityId: row.entityId,
      note: row.note,
      actorName: row.actor.name,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
  };
}
