import type { CustomerWithRisk, UsagePoint } from "@/lib/types";
import {
  formatChurnDays,
  formatUsd,
  getRiskLevel,
  MODEL_HORIZON_DAYS,
  riskLabel,
} from "@/lib/risk";

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
  const level = getRiskLevel(customer.churn_risk_90d);

  drivers.push({
    label: `${riskLabel(level)} 90-day churn risk`,
    detail: `${(customer.churn_risk_90d * 100).toFixed(0)}% probability of churn within 90 days (Cox model; portfolio average ≈ 7%).`,
    severity: level === "high" ? "high" : level === "medium" ? "medium" : "low",
  });

  const trend = usageTrend(usage);
  if (trend === "declining") {
    drivers.push({
      label: "Declining product usage",
      detail: "Login volume dropped in the most recent month vs. prior month.",
      severity: "high",
    });
  } else if (trend === "stable" && level !== "low") {
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

  if (customer.mrr >= 2000 && level === "high") {
    drivers.push({
      label: "High-value account at risk",
      detail: `${formatUsd(customer.mrr)} MRR in ${customer.segment} — prioritize retention ROI.`,
      severity: "high",
    });
  }

  return drivers.slice(0, 5);
}

export function confidenceSummary(
  customer: CustomerWithRisk,
): { headline: string; detail: string } {
  const ci = customer.confidence_interval;
  if (ci?.median_days != null) {
    return {
      headline: `Median time to churn: ${ci.median_days} days`,
      detail: `The model gives a 25% chance of churn by day ${formatChurnDays(ci.lower_days)} and 50% by day ${ci.median_days}; ${
        ci.upper_days != null
          ? `75% by day ${ci.upper_days}`
          : `75% is not reached within the ${MODEL_HORIZON_DAYS}-day horizon`
      }.`,
    };
  }
  if (ci?.lower_days != null) {
    return {
      headline: `25% chance of churn within ${ci.lower_days} days`,
      detail: `Churn is more likely than not to happen after the ${MODEL_HORIZON_DAYS}-day model horizon, so the median is not reported.`,
    };
  }
  return {
    headline: `Likely retained beyond ${MODEL_HORIZON_DAYS} days`,
    detail: `Predicted churn probability stays below 25% across the ${MODEL_HORIZON_DAYS}-day horizon the model is trained on.`,
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
      detail: `${p.event_type.replace(/_/g, " ")} · ${formatUsd(Number(p.amount), 2)}`,
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
