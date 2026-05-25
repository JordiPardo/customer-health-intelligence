import type { PlaybookRow } from "@/lib/types";

function formatAte(ate: number): string {
  if (ate > 0) return `${ate.toFixed(1)}pp lower churn`;
  if (ate < 0) return `${Math.abs(ate).toFixed(1)}pp higher churn`;
  return "0.0pp";
}

export function PlaybookTable({ rows }: { rows: PlaybookRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-base text-[var(--muted)]">
        No causal estimates yet. Run{" "}
        <code className="text-[13px]">python scripts/run_causal_pipeline.py --replace</code>.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-base">
        <thead className="border-b border-[var(--border)]">
          <tr>
            <th className="px-3 py-2 font-medium">Playbook</th>
            <th className="px-3 py-2 font-medium">Segment</th>
            <th className="px-3 py-2 font-medium">ATE (churn reduction)</th>
            <th className="px-3 py-2 font-medium">95% CI</th>
            <th className="px-3 py-2 font-medium">Sample</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[var(--border)] last:border-0"
            >
              <td className="px-3 py-3">
                <p className="font-medium text-[var(--foreground)]">
                  {row.label}
                </p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  {row.description}
                </p>
              </td>
              <td className="px-3 py-3">{row.segment}</td>
              <td className="px-3 py-3">
                <span
                  className={
                    row.ate > 0
                      ? "text-[var(--success)]"
                      : row.ate < 0
                        ? "text-[var(--danger)]"
                        : ""
                  }
                >
                  {formatAte(row.ate)}
                </span>
              </td>
              <td className="px-3 py-3 text-[var(--muted)]">
                [{row.confidence_lower.toFixed(1)}, {row.confidence_upper.toFixed(1)}] pp
              </td>
              <td className="px-3 py-3">{row.sample_size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
