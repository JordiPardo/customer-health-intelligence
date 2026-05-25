import Link from "next/link";
import { RiskBadge } from "@/components/ui/risk-badge";
import { appPath, type AppBase } from "@/lib/app-path";
import type { CustomerWithRisk } from "@/lib/types";

export function AtRiskPanel({
  customers,
  base = "",
}: {
  customers: CustomerWithRisk[];
  base?: AppBase;
}) {
  if (customers.length === 0) {
    return (
      <p className="text-caption">No high-risk accounts in the current portfolio.</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {customers.map((c) => (
        <li key={c.id}>
          <Link
            href={appPath(base, `/customers/${c.id}`)}
            className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-[var(--border-subtle)] -mx-1 px-1 rounded-[var(--radius)]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {c.name}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {c.segment} · ${c.mrr.toLocaleString()} MRR
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <RiskBadge score={c.churn_risk_30d} />
              <span className="text-[11px] tabular-nums text-[var(--muted)]">
                {c.median_days_to_churn ?? "—"}d
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
