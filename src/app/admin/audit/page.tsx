import { ACTION_LABELS, requireAdminPage } from "@/components/admin/admin-page-parts";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAuditEntries } from "@/server/services/admin-core";
import { PageShell } from "@/components/layout/page-shell";

/** Administrative decision history (FR-46). Read-only by design. */
export default async function AdminAuditPage() {
  await requireAdminPage("/admin/audit");
  const { items, total } = await listAuditEntries({ pageSize: 100 });

  return (
    <PageShell
      title="Audit history"
      description={
        <>
          Every administrative decision, who made it, and why. Entries cannot be edited or removed.
        </>
      }
    >
      <p className="mt-3 text-sm text-muted">
        {total} decision{total === 1 ? "" : "s"} recorded
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No decisions recorded yet"
            description="Approvals, rejections, suspensions, and moderation actions appear here."
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-subtle rounded-lg border border-subtle bg-surface">
          {items.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-body">{ACTION_LABELS[entry.action] ?? entry.action}</p>
                <StatusBadge tone="neutral">{entry.entityType.toLowerCase()}</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-muted">
                by {entry.actorName} ·{" "}
                {new Date(entry.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {entry.note ? <p className="mt-1 text-sm text-secondary">{entry.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
