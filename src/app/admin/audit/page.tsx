import { ACTION_LABELS, requireAdminPage } from "@/components/admin/admin-page-parts";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAuditEntries } from "@/server/services/admin-core";

/** Administrative decision history (FR-46). Read-only by design. */
export default async function AdminAuditPage() {
  await requireAdminPage("/admin/audit");
  const { items, total } = await listAuditEntries({ pageSize: 100 });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-heading text-2xl text-body">Audit history</h1>
      <p className="mt-1 text-sm text-secondary">
        Every administrative decision, who made it, and why. Entries cannot be edited or removed.
      </p>
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
    </main>
  );
}
