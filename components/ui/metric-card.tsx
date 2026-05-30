export function MetricCard({
  label,
  value,
  suffix,
  footer,
  trend,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  footer?: React.ReactNode;
  trend?: "neutral" | "positive" | "negative";
  hint?: string;
  accent?: "danger" | "success" | "accent";
}) {
  const trendColor =
    trend === "positive"
      ? "text-[var(--success)]"
      : trend === "negative"
        ? "text-[var(--danger)]"
        : "";

  const accentBar =
    accent === "danger"
      ? "before:bg-[var(--danger)]"
      : accent === "success"
        ? "before:bg-[var(--success)]"
        : accent === "accent"
          ? "before:bg-[var(--accent)]"
          : "";

  return (
    <div
      className={`surface-card lift-on-hover relative overflow-hidden px-4 py-3.5 ${
        accent
          ? `before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${accentBar}`
          : ""
      }`}
    >
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
