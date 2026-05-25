export type RiskLevel = "high" | "medium" | "low";

export function getRiskLevel(churnRisk30d: number): RiskLevel {
  if (churnRisk30d > 0.6) return "high";
  if (churnRisk30d >= 0.3) return "medium";
  return "low";
}

export function riskLabel(level: RiskLevel): string {
  return level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
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
