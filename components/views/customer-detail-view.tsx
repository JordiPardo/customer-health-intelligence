import Link from "next/link";
import { notFound } from "next/navigation";
import { SurvivalChart } from "@/components/charts/survival-chart";
import { UsageChart } from "@/components/charts/usage-chart";
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
    <div className="space-y-8">
      <div>
        <Link
          href={appPath(base, "/customers")}
          className="mb-4 inline-block text-base text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Back to customers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-2">{customer.name}</h1>
            <p className="text-base text-[var(--muted)]">
              {customer.segment} · {customer.plan_tier} · {customer.industry}
            </p>
          </div>
          <RiskBadge score={customer.churn_risk_30d} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="MRR" value={`$${customer.mrr.toLocaleString()}`} />
        <MetricCard
          label="30d churn risk"
          value={`${(customer.churn_risk_30d * 100).toFixed(0)}%`}
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

      <section className="rounded-lg border border-[var(--border)] bg-white p-5">
        <h2 className="mb-4">Survival curve (forward-looking)</h2>
        <p className="mb-4 text-[13px] text-[var(--muted)]">
          Estimated retention from Cox model, conditional on current tenure.
          Dotted line = median days to churn when estimable.
        </p>
        <SurvivalChart
          churnRisk30d={customer.churn_risk_30d}
          churnRisk90d={customer.churn_risk_90d}
          confidenceInterval={customer.confidence_interval}
        />
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-white p-5">
        <h2 className="mb-4">Usage history</h2>
        {usage.length > 0 ? (
          <UsageChart data={usage} />
        ) : (
          <p className="text-base text-[var(--muted)]">No usage events recorded.</p>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2>Recommended actions</h2>
          <Link
            href={appPath(base, "/playbooks")}
            className="text-base text-[var(--primary)] hover:underline"
          >
            View all playbooks
          </Link>
        </div>
        {customer.churn_risk_30d > 0.6 && (
          <p className="mb-3 text-[13px] text-[var(--danger)]">
            High churn risk — prioritize interventions below.
          </p>
        )}
        {segmentPlaybooks.length > 0 ? (
          <ul className="space-y-3">
            {segmentPlaybooks.map((pb) => (
              <li
                key={pb.id}
                className="rounded-md border border-[var(--border)] px-4 py-3"
              >
                <p className="font-medium">{pb.label}</p>
                <p className="mt-1 text-base text-[var(--muted)]">{pb.action}</p>
                <p className="mt-2 text-[13px] text-[var(--muted)]">
                  Observational ATE for {customer.segment}:{" "}
                  <span
                    className={
                      pb.ate > 0 ? "text-[var(--success)]" : "text-[var(--muted)]"
                    }
                  >
                    {pb.ate > 0
                      ? `${pb.ate.toFixed(1)}pp lower churn`
                      : `${Math.abs(pb.ate).toFixed(1)}pp higher churn`}
                  </span>{" "}
                  (95% CI {pb.confidence_lower.toFixed(1)}–
                  {pb.confidence_upper.toFixed(1)}, n={pb.sample_size}). Ranked among
                  playbooks for this segment.
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-base text-[var(--muted)]">
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
              <code className="text-[13px]">
                python scripts/run_causal_pipeline.py --replace
              </code>{" "}
              to load segment playbooks.
            </li>
          </ul>
        )}
      </section>
    </div>
  );
}
