import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AccountHealthHero,
  CustomerTimeline,
  RiskDriversList,
} from "@/components/customers/account-health-panel";
import { RetentionBriefPanel } from "@/components/customers/retention-brief-panel";
import { SurvivalChart } from "@/components/charts/survival-chart";
import { UsageChart } from "@/components/charts/usage-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageToolbar } from "@/components/app/page-toolbar";
import { RiskBadge } from "@/components/ui/risk-badge";
import { PlaybookRecommendationBadge } from "@/components/ui/recommendation-badge";
import { appPath, type AppBase } from "@/lib/app-path";
import {
  buildTimelineEvents,
  confidenceSummary,
  deriveRiskDrivers,
} from "@/lib/customer-health";
import {
  formatChurnImpact,
  playbookRecommendation,
} from "@/lib/playbook-recommendation";
import {
  getCustomerById,
  getCustomerPayments,
  getCustomerSupport,
  getCustomerUsage,
} from "@/lib/queries/customers";
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

  const [usage, payments, support, segmentPlaybooks] = await Promise.all([
    getCustomerUsage(id),
    getCustomerPayments(id),
    getCustomerSupport(id),
    getTopPlaybooksForSegment(customer.segment, 3),
  ]);

  const paymentFailures = payments.filter(
    (p) =>
      p.event_type === "payment_failed" || p.event_type === "invoice_past_due",
  ).length;
  const negativeTickets = support.filter((s) => s.sentiment === "negative").length;

  const riskDrivers = deriveRiskDrivers(customer, usage, {
    paymentFailures,
    negativeTickets,
  });
  const timeline = buildTimelineEvents(payments, support, usage);
  const uncertainty = confidenceSummary(customer);

  return (
    <div className="space-y-6">
      <PageToolbar
        title={customer.name}
        question="Why is this account at risk — and what should you do about it?"
        badge={<RiskBadge score={customer.churn_risk_30d} />}
        actions={
          <Link
            href={appPath(base, "/customers")}
            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--border-subtle)]"
          >
            ← All customers
          </Link>
        }
      />

      <AccountHealthHero customer={customer} />

      <div
        className="grid animate-fade-up gap-3 sm:grid-cols-3"
        style={{ animationDelay: "60ms" }}
      >
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">90-day churn risk</p>
          <p className="mt-1.5 text-stat">
            {(customer.churn_risk_90d * 100).toFixed(0)}%
          </p>
          <p className="mt-1 text-caption">Longer-horizon Cox estimate</p>
        </div>
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">Est. days to churn</p>
          <p className="mt-1.5 text-stat">
            {customer.median_days_to_churn ?? "—"}
          </p>
          <p className="mt-1 text-caption">Median survival time</p>
        </div>
        <div className="stat-tile px-4 py-3.5">
          <p className="text-label">Active risk drivers</p>
          <p
            className={`mt-1.5 text-stat ${
              riskDrivers.length > 0 ? "text-[var(--warning)]" : ""
            }`}
          >
            {riskDrivers.length}
          </p>
          <p className="mt-1 text-caption">Signals flagged below</p>
        </div>
      </div>

      <RetentionBriefPanel
        customerId={customer.id}
        customerName={customer.name}
        isDemo={base === "/demo"}
      />

      <div
        className="grid animate-fade-up gap-4 lg:grid-cols-2"
        style={{ animationDelay: "120ms" }}
      >
        <Card interactive>
          <CardHeader>
            <CardTitle subtitle="Signals driving the current risk band">
              Key risk drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskDriversList drivers={riskDrivers} />
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader>
            <CardTitle subtitle={uncertainty.detail}>
              Confidence & uncertainty
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {uncertainty.headline}
            </p>
            {customer.confidence_interval && (
              <dl className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-2 py-3">
                  <dt className="text-[var(--muted)]">Lower</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {customer.confidence_interval.lower_days ?? "—"}d
                  </dd>
                </div>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-2 py-3">
                  <dt className="text-[var(--muted)]">Median</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {customer.confidence_interval.median_days ?? "—"}d
                  </dd>
                </div>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-2 py-3">
                  <dt className="text-[var(--muted)]">Upper</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {customer.confidence_interval.upper_days ?? "—"}d
                  </dd>
                </div>
              </dl>
            )}
            <p className="text-caption">
              Risk scores are model estimates — combine with qualitative CS
              context before committing discount or escalation playbooks.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card interactive>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card interactive>
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

        <Card interactive>
          <CardHeader>
            <CardTitle subtitle="Billing, support, and usage milestones">
              Account timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerTimeline events={timeline} />
          </CardContent>
        </Card>
      </div>

      <Card interactive>
        <CardHeader>
          <CardTitle subtitle="Causal estimates ranked for this segment — harmful treatments excluded">
            Recommended retention actions
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
              High churn risk — prioritize the top validated playbook below within
              7 days.
            </div>
          )}
          {segmentPlaybooks.length > 0 ? (
            <ul className="space-y-3">
              {segmentPlaybooks.map((pb) => {
                const rec = playbookRecommendation(pb);
                return (
                  <li
                    key={pb.id}
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-4 py-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{pb.label}</p>
                      <PlaybookRecommendationBadge recommendation={rec} />
                    </div>
                    <p className="mt-1 text-caption">{pb.action}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Observational effect for {customer.segment}:{" "}
                      <span
                        className={`font-medium ${
                          pb.ate > 0
                            ? "text-[var(--success)]"
                            : "text-[var(--danger)]"
                        }`}
                      >
                        {formatChurnImpact(pb.ate)}
                      </span>{" "}
                      (95% CI {pb.confidence_lower.toFixed(1)}–
                      {pb.confidence_upper.toFixed(1)} pp, n={pb.sample_size})
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="No beneficial playbooks for this segment"
              description="Run the causal pipeline or review playbooks — no positive ATE estimates are available yet."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
