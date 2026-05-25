export function MetricCard({
  label,
  value,
  suffix,
  footer,
  trend,
  hint,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  footer?: React.ReactNode;
  trend?: "neutral" | "positive" | "negative";
  hint?: string;
}) {
  const trendColor =
    trend === "positive"
      ? "text-[var(--success)]"
      : trend === "negative"
        ? "text-[var(--danger)]"
        : "";

  return (
    <div className="surface-card metric-card-hover px-4 py-3.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-label">{label}</p>
        {hint && <span className="text-[10px] text-[var(--muted)]">{hint}</span>}
      </div>
      <p
        className={`text-2xl font-semibold tracking-tight tabular-nums text-[var(--foreground)] ${trendColor}`}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-sm font-normal text-[var(--muted)]">
            {suffix}
          </span>
        )}
      </p>
      {footer && <div className="mt-2.5">{footer}</div>}
    </div>
  );
}
