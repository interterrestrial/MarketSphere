import { LoadingState } from "@/components/ui/loading-state";

/** Route-level loading UI shown while a segment's data resolves. */
export function SegmentLoading({ label = "Loading this page…" }: { label?: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div aria-hidden="true" className="mb-6 space-y-3">
        <div className="h-8 w-2/5 animate-pulse rounded-md bg-surface" />
        <div className="h-4 w-3/5 animate-pulse rounded-md bg-surface" />
      </div>
      <LoadingState label={label} rows={3} />
    </main>
  );
}
