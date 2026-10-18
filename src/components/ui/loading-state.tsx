/**
 * Loading state for list and panel areas. Announced politely so screen-reader
 * users hear that content is on the way without losing their place.
 */
export function LoadingState({ label = "Loading…", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-20 animate-pulse rounded-lg border border-subtle bg-surface"
        />
      ))}
    </div>
  );
}
