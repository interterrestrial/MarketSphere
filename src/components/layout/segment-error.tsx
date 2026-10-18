import { ErrorState } from "@/components/ui/error-state";

/**
 * Route-level error boundary (Design.md §9: never show a dead-end error).
 * Anything thrown while rendering this segment lands here instead of a blank
 * page, and the user gets a way out.
 */
export function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <ErrorState
        title="Something went wrong on this page"
        message="We could not load this content. Nothing was changed. Try again, and if it keeps happening contact support."
        onRetry={reset}
      />
      {error.digest ? (
        <p className="mt-4 text-center font-mono text-xs text-muted">Reference: {error.digest}</p>
      ) : null}
    </main>
  );
}
