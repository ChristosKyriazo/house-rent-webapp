export function SkeletonCard() {
  return (
    <div className="bg-[var(--surface)] rounded-3xl p-6 shadow-xl border border-[var(--border-subtle)] animate-pulse">
      <div className="flex gap-4">
        <div className="w-24 h-20 rounded-xl bg-[var(--ink-soft)] shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-2/3 rounded-lg bg-[var(--ink-soft)]" />
          <div className="h-4 w-1/3 rounded-lg bg-[var(--ink-soft)]" />
          <div className="h-4 w-1/2 rounded-lg bg-[var(--ink-soft)]" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
