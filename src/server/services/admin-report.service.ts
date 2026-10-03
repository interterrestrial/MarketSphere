import type { Prisma, ReportStatus } from "@prisma/client";
import { db } from "../../lib/db";
import type { AuthUser } from "../../types/auth";
import { AppError, NotFoundError } from "../middleware/error-handler";
import { ADMIN_ACTIONS, AUDIT_ENTITIES, recordAudit } from "./admin-core";

/**
 * Report review (FR-45).
 *
 * Reports are complaints about a user or a listing. Administrators record the
 * outcome and a resolution note; the report itself is never deleted so the
 * moderation history survives.
 */

export interface AdminReportRow {
  id: string;
  reason: string;
  status: ReportStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  reporterName: string;
  reporterId: string;
  reportedUserName: string | null;
  reportedUserId: string | null;
  productName: string | null;
  productId: string | null;
}

const REPORT_INCLUDE = {
  reporter: { select: { id: true, name: true, email: true } },
  reportedUser: { select: { id: true, name: true, email: true } },
  product: { select: { id: true, name: true } },
} satisfies Prisma.ReportInclude;

type ReportRow = Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

function toRow(report: ReportRow): AdminReportRow {
  return {
    id: report.id,
    reason: report.reason,
    status: report.status,
    resolution: report.resolution,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    reporterName: report.reporter.name,
    reporterId: report.reporter.id,
    reportedUserName: report.reportedUser?.name ?? null,
    reportedUserId: report.reportedUser?.id ?? null,
    productName: report.product?.name ?? null,
    productId: report.product?.id ?? null,
  };
}

/** Reports for the review queue, filtered by status. */
export async function listReports(options: {
  status?: ReportStatus;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AdminReportRow[]; total: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const where: Prisma.ReportWhereInput = { ...(options.status ? { status: options.status } : {}) };

  const [rows, total] = await Promise.all([
    db.report.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: REPORT_INCLUDE,
    }),
    db.report.count({ where }),
  ]);

  return { items: rows.map(toRow), total };
}

/**
 * Records the outcome of a report. Resolution text is required so the decision
 * is explainable later.
 */
export async function resolveReport(
  admin: AuthUser,
  reportId: string,
  decision: "resolve" | "dismiss",
  resolution?: string
): Promise<AdminReportRow> {
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError("Report");
  if (report.status === "RESOLVED" || report.status === "DISMISSED") {
    throw new AppError(
      409,
      "ALREADY_REVIEWED",
      `This report was already ${report.status.toLowerCase()}.`
    );
  }
  if (!resolution?.trim()) {
    throw new AppError(
      400,
      "RESOLUTION_REQUIRED",
      "Record what was done so the outcome is on record."
    );
  }

  const updated = await db.report.update({
    where: { id: reportId },
    data: {
      status: decision === "resolve" ? "RESOLVED" : "DISMISSED",
      resolution: resolution.trim(),
    },
    include: REPORT_INCLUDE,
  });

  await recordAudit({
    actorId: admin.id,
    action: decision === "resolve" ? ADMIN_ACTIONS.REPORT_RESOLVED : ADMIN_ACTIONS.REPORT_DISMISSED,
    entityType: AUDIT_ENTITIES.REPORT,
    entityId: reportId,
    note: resolution.trim(),
  });

  return toRow(updated);
}