import Link from "next/link";
import { appPath, type AppBase } from "@/lib/app-path";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toLocaleString()}`;
}

export function PortfolioHealth({
  base = "",
  totalMrr,
  atRiskMrr,
  atRiskCount,
  totalCustomers,
  highPct,
  mediumPct,
  lowPct,
}: {
  base?: AppBase;
  totalMrr: number;
  atRiskMrr: number;
  atRiskCount: number;
  totalCustomers: number;
  highPct: number;
  mediumPct: number;
  lowPct: number;
}) {
  const atRiskShare = totalMrr > 0 ? Math.round((atRiskMrr / totalMrr) * 100) : 0;
  const securedPct = 100 - atRiskShare;

  const bands = [
    { label: "Low", pct: lowPct, color: "var(--success)" },
    { label: "Medium", pct: mediumPct, color: "var(--warning)" },
    { label: "High", pct: highPct, color: "var(--danger)" },
  ];

  return (
    <section className="hero-surface animate-fade-up px-6 py-6 sm:px-8 sm:py-7">
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
        {/* Dominant revenue + risk block */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-label">Portfolio health</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/25 bg-[var(--success-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              {securedPct}% revenue secured
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-5">
            <div>
              <p className="text-label mb-1.5">Revenue at risk · 30d</p>
              <p className="text-display text-[var(--danger)]">
                {formatCurrency(atRiskMrr)}
              </p>
              <p className="mt-1.5 text-caption">
                {atRiskShare}% of MRR across{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {atRiskCount}
                </span>{" "}
                high-risk accounts
              </p>
            </div>

            <div className="pb-1">
              <p className="text-label mb-1.5">Monthly recurring revenue</p>
              <p className="text-stat">{formatCurrency(totalMrr)}</p>
              <p className="mt-1.5 text-caption">
                across {totalCustomers.toLocaleString()} accounts
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={appPath(base, "/customers")}
              className="inline-flex h-9 items-center rounded-[var(--radius)] bg-[var(--primary)] px-4 text-xs font-medium text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[#27272a]"
            >
              Review at-risk accounts
            </Link>
          </div>
        </div>

        {/* Risk composition */}
        <div className="lg:border-l lg:border-[var(--border)] lg:pl-10">
          <p className="text-label mb-3">Risk composition</p>

          <div className="flex h-3 overflow-hidden rounded-full bg-[var(--border-subtle)]">
            {bands.map((b) => (
              <div
                key={b.label}
                style={{ width: `${b.pct}%`, backgroundColor: b.color }}
                className="h-full transition-all duration-500"
              />
            ))}
          </div>

          <dl className="mt-5 space-y-3">
            {bands
              .slice()
              .reverse()
              .map((b) => (
                <div key={b.label} className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    {b.label} risk
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums">{b.pct}%</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
