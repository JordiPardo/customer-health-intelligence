import type { RiskDriver, CustomerTimelineEvent } from "@/lib/customer-health";
import { riskStyles, riskLabel, getRiskLevel } from "@/lib/risk";
import type { CustomerWithRisk } from "@/lib/types";

const RISK_ACTION: Record<string, string> = {
  high: "Immediate retention action recommended.",
  medium: "Monitor closely and consider a targeted playbook.",
  low: "Account is stable — maintain standard success cadence.",
};

export function AccountHealthHero({
  customer,
}: {
  customer: CustomerWithRisk;
}) {
  const level = getRiskLevel(customer.churn_risk_30d);
  const styles = riskStyles[level];

  const facts = [
    { label: "Segment", value: customer.segment },
    { label: "Plan", value: customer.plan_tier },
    { label: "Industry", value: customer.industry },
    { label: "Cohort", value: customer.cohort_month },
    {
      label: "Signed up",
      value: new Date(customer.signup_date).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    },
  ];

  return (
    <section className="hero-surface animate-fade-up px-6 py-6 sm:px-8 sm:py-7">
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
        {/* Dominant risk + revenue */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-label">Account health</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles.bg} ${styles.text} ${styles.border}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  level === "high"
                    ? "bg-[var(--danger)]"
                    : level === "medium"
                      ? "bg-[var(--warning)]"
                      : "bg-[var(--success)]"
                }`}
              />
              {riskLabel(level)} risk
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-5">
            <div>
              <p className="text-label mb-1.5">30-day churn risk</p>
              <p className={`text-display ${styles.text}`}>
                {(customer.churn_risk_30d * 100).toFixed(0)}%
              </p>
              <p className="mt-1.5 text-caption">{RISK_ACTION[level]}</p>
            </div>

            <div className="pb-1">
              <p className="text-label mb-1.5">Revenue exposure · MRR</p>
              <p className="text-stat">${customer.mrr.toLocaleString()}</p>
              <p className="mt-1.5 text-caption">
                {level === "low"
                  ? "Protected — low churn probability"
                  : "At risk if this account churns"}
              </p>
            </div>
          </div>
        </div>

        {/* Account facts */}
        <div className="lg:border-l lg:border-[var(--border)] lg:pl-10">
          <p className="text-label mb-3">Account profile</p>
          <dl className="space-y-2.5">
            {facts.map((f) => (
              <div
                key={f.label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <dt className="text-[var(--muted)]">{f.label}</dt>
                <dd className="font-medium text-[var(--foreground)]">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function AccountHealthSummary({
  customer,
}: {
  customer: CustomerWithRisk;
}) {
  const level = getRiskLevel(customer.churn_risk_30d);
  const styles = riskStyles[level];

  return (
    <div
      className={`rounded-[var(--radius-lg)] border px-5 py-4 ${styles.bg} ${styles.border}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-label mb-1">Account health</p>
          <p className={`text-lg font-semibold ${styles.text}`}>
            {riskLabel(level)} risk
          </p>
          <p className="mt-1 text-caption">
            {level === "high"
              ? "Immediate retention action recommended."
              : level === "medium"
                ? "Monitor closely and consider a targeted playbook."
                : "Account is stable — maintain standard success cadence."}
          </p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <p>{customer.segment}</p>
          <p>{customer.plan_tier} plan</p>
          <p>{customer.industry}</p>
        </div>
      </div>
    </div>
  );
}

export function RiskDriversList({ drivers }: { drivers: RiskDriver[] }) {
  if (drivers.length === 0) {
    return (
      <p className="text-caption">
        No major risk signals detected from available telemetry.
      </p>
    );
  }

  const severityColor = {
    high: "text-[var(--danger)]",
    medium: "text-[var(--warning)]",
    low: "text-[var(--muted)]",
  };

  return (
    <ul className="space-y-3">
      {drivers.map((driver) => (
        <li
          key={driver.label}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-4 py-3"
        >
          <p className={`text-sm font-medium ${severityColor[driver.severity]}`}>
            {driver.label}
          </p>
          <p className="mt-1 text-caption">{driver.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function CustomerTimeline({ events }: { events: CustomerTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-caption">No recent account events in the demo dataset.</p>
    );
  }

  const dotColor = {
    info: "bg-[var(--accent)]",
    warning: "bg-[var(--warning)]",
    danger: "bg-[var(--danger)]",
  };

  return (
    <ol className="relative space-y-4 border-l border-[var(--border)] pl-5">
      {events.map((event, i) => (
        <li key={`${event.date}-${event.title}-${i}`} className="relative">
          <span
            className={`absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full ${dotColor[event.severity]}`}
            aria-hidden
          />
          <p className="text-xs text-[var(--muted)]">
            {new Date(event.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            <span className="mx-1.5">·</span>
            <span className="capitalize">{event.category}</span>
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
            {event.title}
          </p>
          <p className="mt-0.5 text-caption">{event.detail}</p>
        </li>
      ))}
    </ol>
  );
}
