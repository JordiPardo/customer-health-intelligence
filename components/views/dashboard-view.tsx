import Link from "next/link";
import { AtRiskPanel } from "@/components/dashboard/at-risk-panel";
import { RiskDistribution } from "@/components/dashboard/risk-distribution";
import { SegmentBreakdown } from "@/components/dashboard/segment-breakdown";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import { CohortTrendChart } from "@/components/charts/cohort-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { RiskBadgeLevel } from "@/components/ui/risk-badge";
import { appPath, type AppBase } from "@/lib/app-path";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getCustomers } from "@/lib/queries/customers";
import { getRiskLevel } from "@/lib/risk";

function severityClass(severity: string) {
  if (severity === "high") return "text-[var(--danger)]";
  if (severity === "medium") return "text-[var(--warning)]";
  return "text-[var(--muted)]";
}

function buildSegmentBreakdown(
  customers: Awaited<ReturnType<typeof getCustomers>>,
) {
  const map = new Map<string, { count: number; highRisk: number }>();
  for (const c of customers) {
    const entry = map.get(c.segment) ?? { count: 0, highRisk: 0 };
    entry.count += 1;
    if (getRiskLevel(c.churn_risk_30d) === "high") entry.highRisk += 1;
    map.set(c.segment, entry);
  }
  return ["Enterprise", "Mid-Market", "SMB"]
    .filter((s) => map.has(s))
    .map((name) => ({
      name,
      count: map.get(name)!.count,
      highRisk: map.get(name)!.highRisk,
    }));
}

export async function DashboardView({ base = "" }: { base?: AppBase }) {
  const [stats, customers] = await Promise.all([
    getDashboardStats(),
    getCustomers(),
  ]);

  const atRisk = customers
    .filter((c) => c.churn_risk_30d > 0.5)
    .sort((a, b) => b.churn_risk_30d - a.churn_risk_30d)
    .slice(0, 6);

  const segmentBreakdown = buildSegmentBreakdown(customers);
  const isDemo = base === "/demo";

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Dashboard"
        description="Portfolio health overview from Cox survival predictions."
        badge={
          isDemo ? (
            <StatusBadge variant="warning">Demo workspace</StatusBadge>
          ) : (
            <StatusBadge variant="success">Live</StatusBadge>
          )
        }
        meta={
          <>
            <StatusBadge>500 accounts</StatusBadge>
            <StatusBadge>30-day window</StatusBadge>
            <span className="text-xs text-[var(--muted)]">
              Model: Cox PH · Updated today
            </span>
          </>
        }
        actions={
          <Link
            href={appPath(base, "/customers")}
            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--border-subtle)]"
          >
            View all customers
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total customers"
          value={stats.totalCustomers}
          hint="Active in portfolio"
        />
        <MetricCard
          label="High risk"
          value={`${stats.highRiskPct}%`}
          trend={stats.highRiskPct > 20 ? "negative" : "neutral"}
          footer={<RiskBadgeLevel level="high" />}
          hint={`>${Math.round(stats.totalCustomers * (stats.highRiskPct / 100))} accounts`}
        />
        <MetricCard label="Medium risk" value={`${stats.mediumRiskPct}%`} />
        <MetricCard
          label="Low risk"
          value={`${stats.lowRiskPct}%`}
          trend="positive"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle subtitle="Monthly churn rate by customer cohort">
              Cohort churn trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.cohortTrend.length > 0 ? (
              <CohortTrendChart data={stats.cohortTrend} />
            ) : (
              <EmptyState
                title="No cohort data yet"
                description="Run the ML pipeline to populate survival predictions and cohort metrics."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle subtitle="Share of portfolio by risk band">
              Risk distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskDistribution
              highPct={stats.highRiskPct}
              mediumPct={stats.mediumRiskPct}
              lowPct={stats.lowRiskPct}
            />
            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <p className="text-label mb-3">By segment</p>
              <SegmentBreakdown segments={segmentBreakdown} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle subtitle="Top accounts by 30-day churn probability">
              At-risk accounts
            </CardTitle>
            <Link
              href={appPath(base, "/customers")}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            <AtRiskPanel customers={atRisk} base={base} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle subtitle="Deviations from expected cohort performance">
              Recent anomalies
            </CardTitle>
          </CardHeader>
          <CardContent noPadding>
            {stats.anomalies.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  title="No anomalies detected"
                  description="Cohort metrics are within expected ranges."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-shell w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-5 py-3">Cohort</th>
                      <th className="px-5 py-3">Metric</th>
                      <th className="px-5 py-3">Expected</th>
                      <th className="px-5 py-3">Observed</th>
                      <th className="px-5 py-3">Deviation</th>
                      <th className="px-5 py-3">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.anomalies.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="px-5 py-3 font-medium">{a.cohort_month}</td>
                        <td className="px-5 py-3 text-[var(--muted)]">{a.metric}</td>
                        <td className="px-5 py-3 tabular-nums">{a.expected_value}%</td>
                        <td className="px-5 py-3 tabular-nums">{a.observed_value}%</td>
                        <td className="px-5 py-3 tabular-nums">{a.deviation_pct}%</td>
                        <td
                          className={`px-5 py-3 font-medium capitalize ${severityClass(a.severity)}`}
                        >
                          {a.severity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
