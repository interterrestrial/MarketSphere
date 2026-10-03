import { db } from "../../lib/db";

/**
 * Platform statistics for the admin dashboard (FR-41).
 *
 * Every figure is a real count from the database — no illustrative or
 * estimated numbers (Design.md §2).
 */

export interface PlatformStats {
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
  };
  sellers: {
    total: number;
    byVerification: Record<string, number>;
    awaitingReview: number;
  };
  products: {
    total: number;
    byStatus: Record<string, number>;
    awaitingReview: number;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    /** Requests still without a seller decision. */
    awaitingSeller: number;
    awaitingBuyer: number;
  };
  reports: {
    total: number;
    open: number;
  };
}

function toCounts(
  groups: Array<{ _count: { _all: number } }>,
  key: string
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const group of groups) {
    counts[String((group as unknown as Record<string, string>)[key])] = group._count._all;
  }
  return counts;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const [
    userTotal,
    usersByRole,
    usersByStatus,
    sellerTotal,
    sellersByVerification,
    productTotal,
    productsByStatus,
    orderTotal,
    ordersByStatus,
    reportTotal,
    openReports,
  ] = await Promise.all([
    db.user.count(),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.groupBy({ by: ["status"], _count: { _all: true } }),
    db.user.count({ where: { role: "SELLER" } }),
    db.businessProfile.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
    db.product.count(),
    db.product.groupBy({ by: ["status"], _count: { _all: true } }),
    db.orderRequest.count(),
    db.orderRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    db.report.count(),
    db.report.count({ where: { status: "OPEN" } }),
  ]);

  const orderStatusCounts = toCounts(ordersByStatus, "status");
  const productStatusCounts = toCounts(productsByStatus, "status");

  return {
    users: {
      total: userTotal,
      byRole: toCounts(usersByRole, "role"),
      byStatus: toCounts(usersByStatus, "status"),
    },
    sellers: {
      total: sellerTotal,
      byVerification: toCounts(sellersByVerification, "verificationStatus"),
      awaitingReview: sellersByVerification
        .filter(
          (group) =>
            (group as unknown as { verificationStatus: string }).verificationStatus === "PENDING"
        )
        .reduce((sum, group) => sum + group._count._all, 0),
    },
    products: {
      total: productTotal,
      byStatus: productStatusCounts,
      awaitingReview: productStatusCounts["PENDING_REVIEW"] ?? 0,
    },
    orders: {
      total: orderTotal,
      byStatus: orderStatusCounts,
      awaitingSeller: orderStatusCounts["PENDING_SELLER"] ?? 0,
      awaitingBuyer: orderStatusCounts["AWAITING_BUYER"] ?? 0,
    },
    reports: { total: reportTotal, open: openReports },
  };
}
