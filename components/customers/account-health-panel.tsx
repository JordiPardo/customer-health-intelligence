import type { RiskDriver, CustomerTimelineEvent } from "@/lib/customer-health";
import { riskStyles, riskLabel, getRiskLevel } from "@/lib/risk";
import type { CustomerWithRisk } from "@/lib/types";

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
