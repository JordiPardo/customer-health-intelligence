import Link from "next/link";
import { StatusBadge } from "@/components/app/page-toolbar";
import { ExperimentRecommendationBadge } from "@/components/ui/recommendation-badge";
import { appPath, type AppBase } from "@/lib/app-path";
import { experimentRecommendation, significanceLabel } from "@/lib/experiment-recommendation";

export function ExperimentList({
  experiments,
  base = "",
}: {
  experiments: ExperimentRow[];
  base?: AppBase;
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-shell w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-5 py-3">Experiment</th>
              <th className="px-5 py-3">Segment</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Sample</th>
              <th className="px-5 py-3">Uplift</th>
              <th className="px-5 py-3">Significance</th>
              <th className="px-5 py-3">Decision</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((exp) => {
              const rec = experimentRecommendation(exp.status, exp.result);
              return (
              <tr
                key={exp.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-5 py-3.5">
                  <Link
                    href={appPath(base, `/experiments/${exp.id}`)}
                    className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
                  >
                    {exp.label}
                  </Link>
                  <p className="mt-0.5 text-caption">{exp.name}</p>
                </td>
                <td className="px-5 py-3.5 text-[var(--muted)]">
                  {exp.segment ?? "—"}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge
                    variant={exp.status === "running" ? "warning" : "success"}
                  >
                    {exp.status === "running" ? "Running" : "Completed"}
                  </StatusBadge>
                </td>
                <td className="px-5 py-3.5 tabular-nums text-[var(--muted)]">
                  {exp.treatment_count + exp.control_count}
                  <span className="text-xs">
                    {" "}
                    ({exp.treatment_count}T / {exp.control_count}C)
                  </span>
                </td>
                <td className="px-5 py-3.5 tabular-nums">
                  {exp.result ? (
                    <span className="font-medium text-[var(--success)]">
                      +{exp.result.uplift_pct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {exp.result ? (
                    <span
                      className={
                        exp.result.p_value < 0.05
                          ? "font-medium text-[var(--success)]"
                          : "text-[var(--muted)]"
                      }
                    >
                      {significanceLabel(exp.result.p_value)} (p=
                      {exp.result.p_value.toFixed(3)})
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">In progress</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <ExperimentRecommendationBadge recommendation={rec} />
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExperimentChurnComparison({
  result,
}: {
  result: NonNullable<ExperimentRow["result"]>;
}) {
  const max = Math.max(result.treatment_churn_rate, result.control_churn_rate, 0.01);

  return (
    <div className="space-y-4">
      {[
        { label: "Treatment", rate: result.treatment_churn_rate, color: "bg-[var(--accent)]" },
        { label: "Control", rate: result.control_churn_rate, color: "bg-[var(--muted)]" },
      ].map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium">{row.label}</span>
            <span className="tabular-nums text-[var(--muted)]">
              {(row.rate * 100).toFixed(1)}% churn
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--border-subtle)]">
            <div
              className={`h-full rounded-full ${row.color}`}
              style={{ width: `${(row.rate / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
