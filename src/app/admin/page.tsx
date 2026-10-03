import Link from "next/link";
import {
  ACTION_LABELS,
  CountBreakdown,
  Stat,
  requireAdminPage,
} from "@/components/admin/admin-page-parts";
import { listAuditEntries } from "@/server/services/admin-core";
import { getPlatformStats } from "@/server/services/admin-stats.service";

/**
 * Admin dashboard (FR-41, Design.md §7.12): what needs attention first, then
 * the real counts, then recent administrative activity. Administrators do not
 * negotiate commercial terms on anyone's behalf (Use-Case-Diagram §5).
 */
export default async function AdminPage() {
  await requireAdminPage("/admin");
  const [stats, audit] = await Promise.all([getPlatformStats(), listAuditEntries({ pageSize: 8 })]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-heading text-2xl text-body">Platform overview</h1>
      <p className="mt-1 text-sm text-secondary">
        Approve sellers, moderate listings, and handle reports. Every decision is recorded.
      </p>

      <section className="mt-6">
        <h2 className="font-heading text-base text-body">Needs attention</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Sellers awaiting verification"
            value={stats.sellers.awaitingReview}
            href="/admin/verifications"
            emphasis
          />
          <Stat
            label="Listings awaiting review"
            value={stats.products.awaitingReview}
            href="/admin/products"
            emphasis
          />
          <Stat label="Open reports" value={stats.reports.open} href="/admin/reports" emphasis />
          <Stat
            label="Suspended accounts"
            value={stats.users.byStatus["SUSPENDED"] ?? 0}
            href="/admin/users?status=SUSPENDED"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={stats.users.total} href="/admin/users" />
        <Stat label="Sellers" value={stats.sellers.total} />
        <Stat label="Listings" value={stats.products.total} />
        <Stat label="Order requests" value={stats.orders.total} />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-subtle bg-surface p-4">
          <h2 className="font-heading text-base text-body">Accounts by role</h2>
          <div className="mt-3">
            <CountBreakdown counts={stats.users.byRole} />
          </div>
        </div>
        <div className="rounded-lg border border-subtle bg-surface p-4">
          <h2 className="font-heading text-base text-body">Seller verification</h2>
          <div className="mt-3">
            <CountBreakdown counts={stats.sellers.byVerification} />
          </div>
        </div>
        <div className="rounded-lg border border-subtle bg-surface p-4">
          <h2 className="font-heading text-base text-body">Order requests</h2>
          <div className="mt-3">
            <CountBreakdown counts={stats.orders.byStatus} />
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-subtle bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-base text-body">Recent administrative activity</h2>
          <Link href="/admin/audit" className="text-sm text-primary">
            View audit history
          </Link>
        </div>
        {audit.items.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No administrative decisions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {audit.items.map((entry) => (
              <li key={entry.id} className="text-sm">
                <span className="text-body">{ACTION_LABELS[entry.action] ?? entry.action}</span>{" "}
                <span className="text-muted">by {entry.actorName}</span>
                <span className="ml-2 text-xs text-muted">
                  {new Date(entry.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                {entry.note ? <p className="mt-0.5 text-xs text-secondary">{entry.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
