import type { PlaybookRow } from "@/lib/types";

/** Positive ATE = estimated churn reduction (percentage points). Negative = harmful. */
export type PlaybookRecommendation =
  | "recommended"
  | "needs_validation"
  | "do_not_roll_out";

export function playbookRecommendation(row: PlaybookRow): PlaybookRecommendation {
  if (row.ate <= 0) return "do_not_roll_out";
  if (row.confidence_lower > 0) return "recommended";
  return "needs_validation";
}

export function playbookRecommendationLabel(
  rec: PlaybookRecommendation,
): string {
  switch (rec) {
    case "recommended":
      return "Recommended";
    case "needs_validation":
      return "Needs validation";
    case "do_not_roll_out":
      return "Do not roll out";
  }
}

export function formatChurnImpact(ate: number): string {
  if (ate > 0) return `${ate.toFixed(1)}pp lower churn`;
  if (ate < 0) return `${Math.abs(ate).toFixed(1)}pp higher churn`;
  return "No measurable effect";
}

export function isBeneficialPlaybook(row: PlaybookRow): boolean {
  return row.ate > 0;
}

export function rankPlaybooks(rows: PlaybookRow[]): PlaybookRow[] {
  return [...rows].sort((a, b) => b.ate - a.ate);
}

export function recommendedPlaybooks(rows: PlaybookRow[]): PlaybookRow[] {
  return rankPlaybooks(rows).filter(isBeneficialPlaybook);
}
