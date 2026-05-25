export function RiskDistribution({
  highPct,
  mediumPct,
  lowPct,
}: {
  highPct: number;
  mediumPct: number;
  lowPct: number;
}) {
  const rows = [
    { label: "High", pct: highPct, bar: "bg-[var(--danger)]", text: "text-[var(--danger)]" },
    { label: "Medium", pct: mediumPct, bar: "bg-[var(--warning)]", text: "text-[var(--warning)]" },
    { label: "Low", pct: lowPct, bar: "bg-[var(--success)]", text: "text-[var(--success)]" },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-[var(--foreground)]">{row.label}</span>
            <span className={`tabular-nums font-medium ${row.text}`}>{row.pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${row.bar}`}
              style={{ width: `${row.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
