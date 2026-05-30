import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <section
      className={`surface-card ${interactive ? "lift-on-hover" : ""} ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div>
      <h2>{children}</h2>
      {subtitle && <p className="mt-1 text-caption">{subtitle}</p>}
    </div>
  );
}

export function CardContent({
  children,
  className = "",
  noPadding,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={`${noPadding ? "" : "p-5"} ${className}`.trim()}>
      {children}
    </div>
  );
}
