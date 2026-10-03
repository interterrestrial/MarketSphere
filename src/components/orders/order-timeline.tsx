import type { OrderHistoryEntryDto } from "@/types/order";

/**
 * Status timeline (FR-36, Design.md §7.11): the recorded history of a request,
 * newest first, so both parties can see exactly what happened and who did it.
 */
export function OrderTimeline({ history }: { history: OrderHistoryEntryDto[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-muted">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {[...history].reverse().map((entry, index) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className={`mt-1 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-primary" : "bg-muted"}`}
            />
            {index < history.length - 1 ? (
              <span aria-hidden="true" className="mt-1 w-px flex-1 bg-subtle" />
            ) : null}
          </div>
          <div className="pb-1">
            <p className="text-sm text-body">{entry.statusLabel}</p>
            <p className="text-xs text-muted">
              {entry.changedByRole === "BUYER"
                ? "Buyer"
                : entry.changedByRole === "SELLER"
                  ? "Seller"
                  : "Admin"}
              {entry.changedByName ? ` · ${entry.changedByName}` : ""} ·{" "}
              {new Date(entry.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            {entry.note ? <p className="mt-1 text-sm text-secondary">{entry.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
