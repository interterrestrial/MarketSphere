import type { ReactNode } from "react";

/**
 * Recoverable error state with a retry affordance — never a dead-end
 * "something went wrong" screen (Design.md §13).
 */
export function ErrorState({
  title = "We could not load this",
  message,
  onRetry,
  action,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger bg-danger-soft px-6 py-8 text-center"
    >
      <p className="font-heading text-lg text-danger">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-secondary">{message}</p>
      {onRetry || action ? (
        <div className="mt-5 flex justify-center gap-3">
          {action}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border border-subtle bg-surface px-4 py-2 text-sm text-secondary hover:border-primary hover:text-body"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
