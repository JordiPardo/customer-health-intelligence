export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius)] bg-[var(--border)] ${className}`.trim()}
      aria-hidden
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="surface-card px-5 py-4">
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="mb-2 h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className="surface-card p-5">
        <Skeleton className="mb-4 h-5 w-36" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
