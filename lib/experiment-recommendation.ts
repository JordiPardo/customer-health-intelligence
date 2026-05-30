import type { ExperimentResult, ExperimentStatus } from "@/lib/types";

export type ExperimentRecommendation =
  | "roll_out"
  | "continue_testing"
  | "stop";

export function experimentRecommendation(
  status: ExperimentStatus,
  result: ExperimentResult | null,
): ExperimentRecommendation {
  if (status === "running" || !result) return "continue_testing";

  const uplift = result.uplift_pct;
  const significant = result.p_value < 0.05;

  if (uplift <= 0) return "stop";
  if (significant) return "roll_out";
  return "continue_testing";
}

export function experimentRecommendationLabel(
  rec: ExperimentRecommendation,
): string {
  switch (rec) {
    case "roll_out":
      return "Roll out";
    case "continue_testing":
      return "Continue testing";
    case "stop":
      return "Stop";
  }
}

export function significanceLabel(pValue: number): string {
  if (pValue < 0.05) return "Significant";
  if (pValue < 0.1) return "Marginal";
  return "Not significant";
}

export function significanceExplanation(pValue: number): string {
  if (pValue < 0.05) {
    return "Unlikely to be random chance (p < 0.05). Stronger evidence the treatment helped.";
  }
  if (pValue < 0.1) {
    return "Borderline signal (p < 0.10). Worth monitoring with a larger sample.";
  }
  return "Could easily be noise (p ≥ 0.05). Do not roll out based on this result alone.";
}

export function upliftExplanation(upliftPct: number): string {
  if (upliftPct <= 0) {
    return "Treatment did not beat control on churn — relative change was flat or negative.";
  }
  return `Treatment reduced churn by ~${upliftPct.toFixed(0)}% relative to control (e.g. 20% → ${(20 * (1 - upliftPct / 100)).toFixed(1)}% at the same baseline).`;
}
