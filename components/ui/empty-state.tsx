import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--border-subtle)] px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-caption">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
