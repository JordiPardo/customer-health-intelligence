import type { PlaybookRow } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";

function formatAte(ate: number): string {
  if (ate > 0) return `${ate.toFixed(1)}pp lower churn`;
  if (ate < 0) return `${Math.abs(ate).toFixed(1)}pp higher churn`;
  return "0.0pp";
}

export function PlaybookTable({ rows }: { rows: PlaybookRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No causal estimates"
        description="Run python scripts/run_causal_pipeline.py --replace to load data."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-shell w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-5 py-3">Playbook</th>
            <th className="px-5 py-3">Segment</th>
            <th className="px-5 py-3">ATE</th>
            <th className="px-5 py-3">95% CI</th>
            <th className="px-5 py-3">Sample</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[var(--border)] last:border-0"
            >
              <td className="px-5 py-3.5">
                <p className="font-medium text-[var(--foreground)]">
                  {row.label}
                </p>
                <p className="mt-0.5 text-caption">{row.description}</p>
              </td>
              <td className="px-5 py-3.5 text-[var(--muted)]">{row.segment}</td>
              <td className="px-5 py-3.5">
                <span
                  className={`font-medium tabular-nums ${
                    row.ate > 0
                      ? "text-[var(--success)]"
                      : row.ate < 0
                        ? "text-[var(--danger)]"
                        : ""
                  }`}
                >
                  {formatAte(row.ate)}
                </span>
              </td>
              <td className="px-5 py-3.5 tabular-nums text-[var(--muted)]">
                [{row.confidence_lower.toFixed(1)}, {row.confidence_upper.toFixed(1)}] pp
              </td>
              <td className="px-5 py-3.5 tabular-nums">{row.sample_size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
