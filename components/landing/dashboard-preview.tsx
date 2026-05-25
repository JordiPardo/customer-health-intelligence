import Link from "next/link";

/** Static product preview — mirrors real app UI for marketing credibility. */
export function DashboardPreview() {
  return (
    <Link
      href="/demo/dashboard"
      className="group block"
      aria-label="View live demo dashboard"
    >
      <div className="preview-frame overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-preview)] transition-[box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-preview-hover)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--border-subtle)] px-3 py-2">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-[#e4e4e7]" />
            <span className="h-2 w-2 rounded-full bg-[#e4e4e7]" />
            <span className="h-2 w-2 rounded-full bg-[#e4e4e7]" />
          </span>
          <span className="flex-1 text-center text-[10px] font-medium text-[var(--muted)]">
            customer-health.app / dashboard
          </span>
        </div>

        <div className="flex min-h-[340px] text-left sm:min-h-[380px]">
          <div className="hidden w-[88px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] py-3 sm:block">
            <p className="px-2.5 pb-2 text-[9px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Analytics
            </p>
            {["Dashboard", "Customers", "Playbooks"].map((item, i) => (
              <div
                key={item}
                className={`mx-1.5 mb-0.5 rounded px-2 py-1.5 text-[10px] font-medium ${
                  i === 0
                    ? "bg-[var(--border-subtle)] text-[var(--foreground)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1 bg-[var(--background)] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-[var(--foreground)]">
                  Portfolio overview
                </p>
                <p className="text-[9px] text-[var(--muted)]">Last 30 days · 500 accounts</p>
              </div>
              <span className="rounded-full border border-[var(--success)]/30 bg-[var(--success-muted)] px-2 py-0.5 text-[9px] font-medium text-[var(--success)]">
                Live
              </span>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-1.5 sm:gap-2">
              {[
                { label: "Customers", value: "500" },
                { label: "High risk", value: "22%", warn: true },
                { label: "Medium", value: "41%" },
                { label: "Low risk", value: "37%", good: true },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 shadow-[var(--shadow-sm)]"
                >
                  <p className="text-[8px] uppercase tracking-wide text-[var(--muted)]">
                    {kpi.label}
                  </p>
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      kpi.warn
                        ? "text-[var(--danger)]"
                        : kpi.good
                          ? "text-[var(--success)]"
                          : "text-[var(--foreground)]"
                    }`}
                  >
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-5">
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 sm:col-span-3">
                <p className="mb-2 text-[9px] font-medium text-[var(--foreground)]">
                  Cohort churn trend
                </p>
                <PreviewChart />
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 sm:col-span-2">
                <p className="mb-2 text-[9px] font-medium text-[var(--foreground)]">
                  Risk mix
                </p>
                <div className="space-y-1.5">
                  {[
                    { label: "High", pct: 22, color: "bg-[var(--danger)]" },
                    { label: "Medium", pct: 41, color: "bg-[var(--warning)]" },
                    { label: "Low", pct: 37, color: "bg-[var(--success)]" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-1.5">
                      <span className="w-10 text-[8px] text-[var(--muted)]">{row.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                        <div
                          className={`h-full rounded-full ${row.color}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[8px] tabular-nums text-[var(--muted)]">
                        {row.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
              <div className="border-b border-[var(--border)] bg-[var(--border-subtle)] px-2 py-1.5">
                <p className="text-[9px] font-medium text-[var(--foreground)]">
                  At-risk accounts
                </p>
              </div>
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="text-[var(--muted)]">
                    <th className="px-2 py-1 text-left font-medium">Account</th>
                    <th className="px-2 py-1 text-left font-medium">Segment</th>
                    <th className="px-2 py-1 text-right font-medium">30d risk</th>
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_ROWS.map((row) => (
                    <tr
                      key={row.name}
                      className="border-t border-[var(--border)] text-[var(--foreground)]"
                    >
                      <td className="px-2 py-1 font-medium">{row.name}</td>
                      <td className="px-2 py-1 text-[var(--muted)]">{row.segment}</td>
                      <td className="px-2 py-1 text-right">
                        <span
                          className={`inline-block rounded px-1 py-px font-medium ${row.badge}`}
                        >
                          {row.risk}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-[var(--muted)] transition-colors group-hover:text-[var(--foreground)]">
        Click to explore the live demo →
      </p>
    </Link>
  );
}

const PREVIEW_ROWS = [
  { name: "Northwind Labs", segment: "Enterprise", risk: 78, badge: "bg-[var(--danger-muted)] text-[var(--danger)]" },
  { name: "Acme Analytics", segment: "Mid-Market", risk: 71, badge: "bg-[var(--danger-muted)] text-[var(--danger)]" },
  { name: "Globex Systems", segment: "SMB", risk: 64, badge: "bg-[var(--warning-muted)] text-[var(--warning)]" },
  { name: "Initech Corp", segment: "Enterprise", risk: 62, badge: "bg-[var(--warning-muted)] text-[var(--warning)]" },
];

function PreviewChart() {
  const heights = [28, 35, 42, 38, 45, 52, 48];
  return (
    <div className="flex h-16 items-end gap-1 px-0.5">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-[var(--accent)]/80"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
