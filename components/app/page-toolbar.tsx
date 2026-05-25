import type { ReactNode } from "react";

export function PageToolbar({
  title,
  description,
  badge,
  meta,
  actions,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-caption">{description}</p>
        )}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning";
}) {
  const styles = {
    neutral: "border-[var(--border)] bg-[var(--border-subtle)] text-[var(--muted)]",
    success: "border-[var(--success)]/25 bg-[var(--success-muted)] text-[var(--success)]",
    warning: "border-[var(--warning)]/25 bg-[var(--warning-muted)] text-[var(--warning)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
