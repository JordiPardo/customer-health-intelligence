import type { CustomerWithRisk, UsagePoint } from "@/lib/types";
import { getRiskLevel, riskLabel } from "@/lib/risk";

export type CustomerTimelineEvent = {
  date: string;
  category: "payment" | "support" | "usage";
  title: string;
  detail: string;
  severity: "info" | "warning" | "danger";
};

export type RiskDriver = {
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

function usageTrend(usage: UsagePoint[]): "declining" | "stable" | "growing" | "unknown" {
  if (usage.length < 2) return "unknown";
  const recent = usage.slice(-2);
  const delta = recent[1].logins - recent[0].logins;
  if (delta <= -5) return "declining";
  if (delta >= 5) return "growing";
  return "stable";
}

export function deriveRiskDrivers(
  customer: CustomerWithRisk,
  usage: UsagePoint[],
  options: {
    paymentFailures?: number;
    negativeTickets?: number;
  } = {},
): RiskDriver[] {
  const drivers: RiskDriver[] = [];
  const level = getRiskLevel(customer.churn_risk_30d);

  drivers.push({
    label: `${riskLabel(level)} 30-day churn risk`,
    detail: `${(customer.churn_risk_30d * 100).toFixed(0)}% probability of churn within 30 days (Cox model).`,
    severity: level === "high" ? "high" : level === "medium" ? "medium" : "low",
  });

  const trend = usageTrend(usage);
  if (trend === "declining") {
    drivers.push({
      label: "Declining product usage",
      detail: "Login volume dropped in the most recent month vs. prior month.",
      severity: "high",
    });
  } else if (trend === "stable" && customer.churn_risk_30d >= 0.3) {
    drivers.push({
      label: "Flat engagement",
      detail: "Usage is not recovering — account may need proactive outreach.",
      severity: "medium",
    });
  }

  if ((options.paymentFailures ?? 0) > 0) {
    drivers.push({
      label: "Billing friction",
      detail: `${options.paymentFailures} failed or past-due payment event(s) on record.`,
      severity: "high",
    });
  }

  if ((options.negativeTickets ?? 0) >= 2) {
    drivers.push({
      label: "Support dissatisfaction",
      detail: `${options.negativeTickets} negative support tickets — common precursor to churn.`,
      severity: "medium",
    });
  }

  if (customer.mrr >= 5000 && customer.churn_risk_30d > 0.4) {
    drivers.push({
      label: "High-value account at risk",
      detail: `$${customer.mrr.toLocaleString()} MRR in ${customer.segment} — prioritize retention ROI.`,
      severity: "high",
    });
  }

  if (customer.churn_risk_90d - customer.churn_risk_30d > 0.15) {
    drivers.push({
      label: "Risk accelerating over time",
      detail: "90-day risk materially exceeds 30-day — deterioration may be underway.",
      severity: "medium",
    });
  }

  return drivers.slice(0, 5);
}

export function confidenceSummary(
  customer: CustomerWithRisk,
): { headline: string; detail: string } {
  const ci = customer.confidence_interval;
  if (!ci?.lower_days || !ci?.upper_days) {
    return {
      headline: "Moderate confidence",
      detail:
        "Survival estimates use synthetic telemetry. With real product data, confidence intervals tighten as usage history grows.",
    };
  }

  return {
    headline: "Estimated churn window",
    detail: `Median ${ci.median_days ?? "—"} days to churn (90% CI: ${ci.lower_days}–${ci.upper_days} days). Wider intervals mean less historical signal for this account profile.`,
  };
}

export function buildTimelineEvents(
  payments: Array<{ event_date: string; event_type: string; amount: number }>,
  support: Array<{ ticket_date: string; sentiment: string; category: string }>,
  usage: UsagePoint[],
): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];

  for (const p of payments.slice(-8)) {
    const isBad =
      p.event_type === "payment_failed" || p.event_type === "invoice_past_due";
    events.push({
      date: p.event_date,
      category: "payment",
      title: isBad ? "Payment issue" : "Payment received",
      detail: `${p.event_type.replace(/_/g, " ")} · $${Number(p.amount).toLocaleString()}`,
      severity: isBad ? "danger" : "info",
    });
  }

  for (const s of support.slice(-6)) {
    events.push({
      date: s.ticket_date,
      category: "support",
      title: `${s.sentiment} support ticket`,
      detail: s.category.replace(/_/g, " "),
      severity:
        s.sentiment === "negative"
          ? "danger"
          : s.sentiment === "neutral"
            ? "warning"
            : "info",
    });
  }

  for (const u of usage.slice(-4)) {
    const total = u.logins + u.feature_used + u.api_call;
    events.push({
      date: `${u.month}-01`,
      category: "usage",
      title: "Monthly usage snapshot",
      detail: `${u.logins} logins · ${u.feature_used} feature events · ${u.api_call} API calls (${total} total)`,
      severity: u.logins < 10 ? "warning" : "info",
    });
  }

  return events
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
}
