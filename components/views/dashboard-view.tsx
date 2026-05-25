import Link from "next/link";
import { CohortTrendChart } from "@/components/charts/cohort-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadgeLevel } from "@/components/ui/risk-badge";
import { appPath, type AppBase } from "@/lib/app-path";
import { getDashboardStats } from "@/lib/queries/dashboard";

function severityClass(severity: string) {
  if (severity === "high") return "text-[var(--danger)]";
  if (severity === "medium") return "text-[var(--warning)]";
  return "text-[var(--muted)]";
}

export async function DashboardView({ base = "" }: { base?: AppBase }) {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Portfolio health overview from Cox survival predictions."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total customers" value={stats.totalCustomers} />
        <MetricCard
          label="High risk"
          value={`${stats.highRiskPct}%`}
          trend={stats.highRiskPct > 20 ? "negative" : "neutral"}
          footer={<RiskBadgeLevel level="high" />}
        />
        <MetricCard label="Medium risk" value={`${stats.mediumRiskPct}%`} />
        <MetricCard
          label="Low risk"
          value={`${stats.lowRiskPct}%`}
          trend="positive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle
            subtitle="Monthly churn rate by customer cohort"
          >
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
          <CardTitle subtitle="Deviations from expected cohort performance">
            Recent anomalies
          </CardTitle>
          <Link
            href={appPath(base, "/customers")}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            View customers →
          </Link>
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
                      <td className="px-5 py-3.5 font-medium">{a.cohort_month}</td>
                      <td className="px-5 py-3.5 text-[var(--muted)]">{a.metric}</td>
                      <td className="px-5 py-3.5 tabular-nums">{a.expected_value}%</td>
                      <td className="px-5 py-3.5 tabular-nums">{a.observed_value}%</td>
                      <td className="px-5 py-3.5 tabular-nums">{a.deviation_pct}%</td>
                      <td className={`px-5 py-3.5 capitalize font-medium ${severityClass(a.severity)}`}>
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
  );
}
