export function SegmentBreakdown({
  segments,
}: {
  segments: { name: string; count: number; highRisk: number }[];
}) {
  const max = Math.max(...segments.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {segments.map((seg) => (
        <div key={seg.name}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium">{seg.name}</span>
            <span className="tabular-nums text-[var(--muted)]">
              {seg.count}{" "}
              <span className="text-[var(--danger)]">({seg.highRisk} high)</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--brand)]/75"
              style={{ width: `${(seg.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
