import type { ReactNode } from "react";

/** Empty state with a clear next action (Design.md §9, §14 checklist). */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-subtle bg-surface px-6 py-10 text-center">
      <p className="font-heading text-lg text-body">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-secondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
