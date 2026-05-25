export function MetricCard({
  label,
  value,
  suffix,
  footer,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white px-5 py-4">
      <p className="mb-1 text-[13px] text-[var(--muted)]">{label}</p>
      <p className="text-[24px] font-medium leading-tight text-[var(--foreground)]">
        {value}
        {suffix && (
          <span className="ml-1 text-base font-normal text-[var(--muted)]">
            {suffix}
          </span>
        )}
      </p>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
