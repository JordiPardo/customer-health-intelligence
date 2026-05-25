export function MetricCard({
  label,
  value,
  suffix,
  footer,
  trend,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  footer?: React.ReactNode;
  trend?: "neutral" | "positive" | "negative";
}) {
  const trendColor =
    trend === "positive"
      ? "text-[var(--success)]"
      : trend === "negative"
        ? "text-[var(--danger)]"
        : "";

  return (
    <div className="surface-card px-5 py-4">
      <p className="text-label mb-2">{label}</p>
      <p
        className={`text-2xl font-semibold tracking-tight text-[var(--foreground)] ${trendColor}`}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-sm font-normal text-[var(--muted)]">
            {suffix}
          </span>
        )}
      </p>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
