import Link from "next/link";
import { notFound } from "next/navigation";
import { SurvivalChart } from "@/components/charts/survival-chart";
import { UsageChart } from "@/components/charts/usage-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import { MetricCard } from "@/components/ui/metric-card";
import { RiskBadge } from "@/components/ui/risk-badge";
import { appPath, type AppBase } from "@/lib/app-path";
import { getCustomerById, getCustomerUsage } from "@/lib/queries/customers";
import { getTopPlaybooksForSegment } from "@/lib/queries/playbooks";

export async function CustomerDetailView({
  id,
  base = "",
}: {
  id: string;
  base?: AppBase;
}) {
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const [usage, segmentPlaybooks] = await Promise.all([
    getCustomerUsage(id),
    getTopPlaybooksForSegment(customer.segment, 3),
  ]);

  return (
    <div className="space-y-6">
      <PageToolbar
        title={customer.name}
        description={`${customer.segment} · ${customer.plan_tier} · ${customer.industry}`}
        badge={<RiskBadge score={customer.churn_risk_30d} />}
        meta={
          <>
            <StatusBadge>${customer.mrr.toLocaleString()} MRR</StatusBadge>
            <StatusBadge>{customer.cohort_month} cohort</StatusBadge>
          </>
        }
        actions={
          <Link
            href={appPath(base, "/customers")}
            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--border-subtle)]"
          >
            ← All customers
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="MRR" value={`$${customer.mrr.toLocaleString()}`} />
        <MetricCard
          label="30d churn risk"
          value={`${(customer.churn_risk_30d * 100).toFixed(0)}%`}
          trend={customer.churn_risk_30d > 0.6 ? "negative" : "neutral"}
        />
        <MetricCard
          label="90d churn risk"
          value={`${(customer.churn_risk_90d * 100).toFixed(0)}%`}
        />
        <MetricCard
          label="Median days to churn"
          value={customer.median_days_to_churn ?? "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle
            subtitle="Estimated retention from Cox model, conditional on current tenure"
          >
            Survival curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SurvivalChart
            churnRisk30d={customer.churn_risk_30d}
            churnRisk90d={customer.churn_risk_90d}
            confidenceInterval={customer.confidence_interval}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle subtitle="Monthly product engagement signals">
            Usage history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usage.length > 0 ? (
            <UsageChart data={usage} />
          ) : (
            <EmptyState
              title="No usage events"
              description="Usage telemetry has not been recorded for this account."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle subtitle="Causal estimates ranked for this segment">
            Recommended actions
          </CardTitle>
          <Link
            href={appPath(base, "/playbooks")}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            All playbooks →
          </Link>
        </CardHeader>
        <CardContent>
          {customer.churn_risk_30d > 0.6 && (
            <div className="mb-4 rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-muted)] px-3.5 py-2.5 text-xs text-[var(--danger)]">
              High churn risk — prioritize interventions below.
            </div>
          )}
          {segmentPlaybooks.length > 0 ? (
            <ul className="space-y-3">
              {segmentPlaybooks.map((pb) => (
                <li
                  key={pb.id}
                  className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-4 py-3.5"
                >
                  <p className="text-sm font-medium">{pb.label}</p>
                  <p className="mt-1 text-caption">{pb.action}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Observational ATE for {customer.segment}:{" "}
                    <span
                      className={
                        pb.ate > 0 ? "font-medium text-[var(--success)]" : ""
                      }
                    >
                      {pb.ate > 0
                        ? `${pb.ate.toFixed(1)}pp lower churn`
                        : `${Math.abs(pb.ate).toFixed(1)}pp higher churn`}
                    </span>{" "}
                    (95% CI {pb.confidence_lower.toFixed(1)}–
                    {pb.confidence_upper.toFixed(1)}, n={pb.sample_size})
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2 text-caption">
              {customer.churn_risk_30d > 0.6 && (
                <li>Schedule success outreach within 7 days (high risk).</li>
              )}
              {customer.churn_risk_30d >= 0.3 && customer.churn_risk_30d <= 0.6 && (
                <li>Offer feature training webinar (medium risk).</li>
              )}
              {customer.churn_risk_30d < 0.3 && (
                <li>Maintain standard touchpoints; account is healthy.</li>
              )}
              <li>
                Run{" "}
                <code className="rounded bg-[var(--border-subtle)] px-1 py-0.5 text-xs">
                  python scripts/run_causal_pipeline.py --replace
                </code>{" "}
                to load segment playbooks.
              </li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
