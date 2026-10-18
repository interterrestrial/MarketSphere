import Link from "next/link";
import type { ReportStatus } from "@prisma/client";
import { requireAdminPage } from "@/components/admin/admin-page-parts";
import { ReportReviewCard } from "@/components/admin/report-review-card";
import { EmptyState } from "@/components/ui/empty-state";
import { listReports } from "@/server/services/admin-report.service";
import { PageShell } from "@/components/layout/page-shell";

const FILTERS: Array<{ value?: ReportStatus; label: string }> = [
  { value: "OPEN", label: "Open" },
  { label: "All" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
];

/** Report review queue (FR-45). */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/reports");
  const params = await searchParams;
  const raw = typeof params.status === "string" ? params.status : "OPEN";
  const status = (raw === "ALL" ? undefined : raw) as ReportStatus | undefined;

  const { items, total } = await listReports({ status, pageSize: 50 });

  return (
    <PageShell
      title="Reports"
      description={
        <>Complaints from buyers and sellers. Record what was done so the outcome is on record.</>
      }
    >
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={
              filter.value ? `/admin/reports?status=${filter.value}` : "/admin/reports?status=ALL"
            }
            className={`rounded-md border px-3 py-1.5 text-sm ${
              status === filter.value
                ? "border-primary text-body"
                : "border-subtle text-secondary hover:text-body"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted">
        {total} report{total === 1 ? "" : "s"}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No reports here"
            description="Nothing has been reported in this state. Buyers and sellers can report listings and accounts from their dashboards."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((report) => (
            <ReportReviewCard key={report.id} report={report} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
