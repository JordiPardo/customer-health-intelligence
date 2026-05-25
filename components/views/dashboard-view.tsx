import Link from "next/link";
import { CohortTrendChart } from "@/components/charts/cohort-trend-chart";
import { MetricCard } from "@/components/ui/metric-card";
import { RiskBadgeLevel } from "@/components/ui/risk-badge";
import { appPath, type AppBase } from "@/lib/app-path";
import { getDashboardStats } from "@/lib/queries/dashboard";

export async function DashboardView({ base = "" }: { base?: AppBase }) {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1">Dashboard</h1>
        <p className="text-base text-[var(--muted)]">
          Portfolio health overview from Cox survival predictions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total customers" value={stats.totalCustomers} />
        <MetricCard
          label="High risk"
          value={`${stats.highRiskPct}%`}
          footer={<RiskBadgeLevel level="high" />}
        />
        <MetricCard label="Medium risk" value={`${stats.mediumRiskPct}%`} />
        <MetricCard label="Low risk" value={`${stats.lowRiskPct}%`} />
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-white p-5">
        <h2 className="mb-4">Cohort churn trend</h2>
        {stats.cohortTrend.length > 0 ? (
          <CohortTrendChart data={stats.cohortTrend} />
        ) : (
          <p className="text-base text-[var(--muted)]">No cohort data yet.</p>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2>Recent anomalies</h2>
          <Link
            href={appPath(base, "/customers")}
            className="text-base text-[var(--primary)] hover:underline"
          >
            View customers
          </Link>
        </div>
        {stats.anomalies.length === 0 ? (
          <p className="text-base text-[var(--muted)]">
            No cohort anomalies detected.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead className="border-b border-[var(--border)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Cohort</th>
                  <th className="px-3 py-2 font-medium">Metric</th>
                  <th className="px-3 py-2 font-medium">Expected</th>
                  <th className="px-3 py-2 font-medium">Observed</th>
                  <th className="px-3 py-2 font-medium">Deviation</th>
                  <th className="px-3 py-2 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {stats.anomalies.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-3 py-3">{a.cohort_month}</td>
                    <td className="px-3 py-3">{a.metric}</td>
                    <td className="px-3 py-3">{a.expected_value}%</td>
                    <td className="px-3 py-3">{a.observed_value}%</td>
                    <td className="px-3 py-3">{a.deviation_pct}%</td>
                    <td className="px-3 py-3 capitalize">{a.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
