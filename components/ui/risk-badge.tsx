import { getRiskLevel, riskLabel, riskStyles, type RiskLevel } from "@/lib/risk";

export function RiskBadge({ score }: { score: number }) {
  const level = getRiskLevel(score);
  return <RiskBadgeLevel level={level} />;
}

export function RiskBadgeLevel({ level }: { level: RiskLevel }) {
  const styles = riskStyles[level];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles.bg} ${styles.text} ${styles.border}`}
    >
      {riskLabel(level)}
    </span>
  );
}
