// Shown at once while a page's data loads, so a click feels answered.
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 rounded-xl bg-line" />
      <div className="h-4 w-80 max-w-full rounded-lg bg-line" />
      <div className="mt-2 h-40 rounded-3xl bg-surface" />
      <div className="h-56 rounded-3xl bg-surface" />
    </div>
  );
}
