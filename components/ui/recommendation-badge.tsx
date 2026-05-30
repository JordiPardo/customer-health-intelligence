import type { ExperimentRecommendation } from "@/lib/experiment-recommendation";
import type { PlaybookRecommendation } from "@/lib/playbook-recommendation";

const playbookStyles: Record<
  PlaybookRecommendation,
  { bg: string; text: string; border: string }
> = {
  recommended: {
    bg: "bg-[var(--success-muted)]",
    text: "text-[var(--success)]",
    border: "border-[var(--success)]/25",
  },
  needs_validation: {
    bg: "bg-[var(--warning-muted)]",
    text: "text-[var(--warning)]",
    border: "border-[var(--warning)]/25",
  },
  do_not_roll_out: {
    bg: "bg-[var(--danger-muted)]",
    text: "text-[var(--danger)]",
    border: "border-[var(--danger)]/25",
  },
};

const experimentStyles: Record<
  ExperimentRecommendation,
  { bg: string; text: string; border: string }
> = {
  roll_out: playbookStyles.recommended,
  continue_testing: playbookStyles.needs_validation,
  stop: playbookStyles.do_not_roll_out,
};

export function PlaybookRecommendationBadge({
  recommendation,
}: {
  recommendation: PlaybookRecommendation;
}) {
  const s = playbookStyles[recommendation];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text} ${s.border}`}
    >
      {recommendation === "recommended"
        ? "Recommended"
        : recommendation === "needs_validation"
          ? "Needs validation"
          : "Do not roll out"}
    </span>
  );
}

export function ExperimentRecommendationBadge({
  recommendation,
}: {
  recommendation: ExperimentRecommendation;
}) {
  const s = experimentStyles[recommendation];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text} ${s.border}`}
    >
      {recommendation === "roll_out"
        ? "Roll out"
        : recommendation === "continue_testing"
          ? "Continue testing"
          : "Stop"}
    </span>
  );
}
