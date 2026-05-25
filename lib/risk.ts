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
    bg: "bg-red-50",
    text: "text-[var(--danger)]",
    border: "border-red-200",
  },
  medium: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  low: {
    bg: "bg-green-50",
    text: "text-[var(--success)]",
    border: "border-green-200",
  },
};
