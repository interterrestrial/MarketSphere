import { Button } from "@/components/ui/button";

/**
 * Recoverable error state with a retry affordance — never a dead-end
 * "something went wrong" screen (Design.md §13).
 */
export function ErrorState({
  title = "We could not load this",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-danger px-6 py-8 text-center">
      <p className="font-heading text-lg text-body">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-secondary">{message}</p>
      {onRetry ? (
        <div className="mt-5">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
