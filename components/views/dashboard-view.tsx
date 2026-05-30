import Link from "next/link";
import { AtRiskPanel } from "@/components/dashboard/at-risk-panel";
import { PortfolioHealth } from "@/components/dashboard/portfolio-health";
import { RiskDistribution } from "@/components/dashboard/risk-distribution";
import { SegmentBreakdown } from "@/components/dashboard/segment-breakdown";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import { CohortTrendChart } from "@/components/charts/cohort-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

  const totalMrr = customers.reduce((sum, c) => sum + c.mrr, 0);
  const highRiskCustomers = customers.filter(
    (c) => getRiskLevel(c.churn_risk_30d) === "high",
  );
  const atRiskMrr = highRiskCustomers.reduce((sum, c) => sum + c.mrr, 0);
  const avgRisk =
    customers.length > 0
      ? Math.round(
          (customers.reduce((sum, c) => sum + c.churn_risk_30d, 0) /
            customers.length) *
            100,
        )
      : 0;
  const needsAttention = customers.filter(
    (c) => getRiskLevel(c.churn_risk_30d) !== "low",
  ).length;
  const healthyAccounts = customers.length - needsAttention;

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

      <PortfolioHealth
        base={base}
        totalMrr={totalMrr}
        atRiskMrr={atRiskMrr}
        atRiskCount={highRiskCustomers.length}
        totalCustomers={stats.totalCustomers}
        highPct={stats.highRiskPct}
        mediumPct={stats.mediumRiskPct}
        lowPct={stats.lowRiskPct}
      />

      <div
        className="grid animate-fade-up gap-3 sm:grid-cols-3"
        style={{ animationDelay: "60ms" }}
      >
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">Avg 30-day risk</p>
          <p className="mt-1.5 text-stat">{avgRisk}%</p>
          <p className="mt-1 text-caption">Portfolio-wide mean</p>
        </div>
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">Needs attention</p>
          <p className="mt-1.5 text-stat text-[var(--warning)]">
            {needsAttention}
          </p>
          <p className="mt-1 text-caption">High or medium risk accounts</p>
        </div>
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">Healthy accounts</p>
          <p className="mt-1.5 text-stat text-[var(--success)]">
            {healthyAccounts}
          </p>
          <p className="mt-1 text-caption">Low-risk, stable cadence</p>
        </div>
      </div>

      <div
        className="grid animate-fade-up gap-4 lg:grid-cols-3"
        style={{ animationDelay: "120ms" }}
      >
        <Card className="lg:col-span-2" interactive>
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

        <Card interactive>
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

      <div
        className="grid animate-fade-up gap-4 lg:grid-cols-3"
        style={{ animationDelay: "180ms" }}
      >
        <Card interactive>
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

        <Card className="lg:col-span-2" interactive>
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
