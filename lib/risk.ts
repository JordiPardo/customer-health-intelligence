export type RiskLevel = "high" | "medium" | "low";

/**
 * Risk bands use the 90-day churn probability from the survival model.
 * The portfolio baseline is roughly 7%, so "high" is about double the
 * average risk and "medium" is above average.
 */
export const RISK_THRESHOLDS = { high: 0.15, medium: 0.08 } as const;

/** Survival model horizon; churn-timing estimates beyond it are not reported. */
export const MODEL_HORIZON_DAYS = 180;

export function getRiskLevel(churnRisk90d: number): RiskLevel {
  if (churnRisk90d >= RISK_THRESHOLDS.high) return "high";
  if (churnRisk90d >= RISK_THRESHOLDS.medium) return "medium";
  return "low";
}

export function riskLabel(level: RiskLevel): string {
  return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
}

export function formatUsd(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

/** Days until a churn-timing quantile, or ">180" when beyond the model horizon. */
export function formatChurnDays(days: number | null | undefined): string {
  return days == null ? `>${MODEL_HORIZON_DAYS}` : String(days);
}

export const riskStyles: Record<
  RiskLevel,
  { bg: string; text: string; border: string }
> = {
  high: {
    bg: "bg-[var(--danger-muted)]",
    text: "text-[var(--danger)]",
    border: "border-[var(--danger)]/20",
  },
  medium: {
    bg: "bg-[var(--warning-muted)]",
    text: "text-[var(--warning)]",
    border: "border-[var(--warning)]/20",
  },
  low: {
    bg: "bg-[var(--success-muted)]",
    text: "text-[var(--success)]",
    border: "border-[var(--success)]/20",
  },
};

/** Probability-weighted MRR expected to churn in the next 90 days. */
export function expectedMrrAtRisk(
  customers: { mrr: number; churn_risk_90d: number }[],
): number {
  return customers.reduce((sum, c) => sum + c.mrr * c.churn_risk_90d, 0);
}
