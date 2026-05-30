import Link from "next/link";
import { StatusBadge } from "@/components/app/page-toolbar";
import { ExperimentRecommendationBadge } from "@/components/ui/recommendation-badge";
import { appPath, type AppBase } from "@/lib/app-path";
import {
  experimentRecommendation,
  significanceExplanation,
  significanceLabel,
  upliftExplanation,
} from "@/lib/experiment-recommendation";
import type { ExperimentRow } from "@/lib/types";
import { ExperimentChurnComparison, formatDate } from "./experiment-list";

export function ExperimentCards({
  experiments,
  base = "",
}: {
  experiments: ExperimentRow[];
  base?: AppBase;
}) {
  const running = experiments.filter((e) => e.status === "running");
  const completed = experiments.filter((e) => e.status === "completed");

  return (
    <div className="space-y-8">
      {running.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold tracking-tight">
            Running ({running.length})
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {running.map((exp) => (
              <ExperimentCard key={exp.id} experiment={exp} base={base} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold tracking-tight">
            Completed ({completed.length})
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {completed.map((exp) => (
              <ExperimentCard key={exp.id} experiment={exp} base={base} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ExperimentCard({
  experiment,
  base = "",
}: {
  experiment: ExperimentRow;
  base?: AppBase;
}) {
  const rec = experimentRecommendation(experiment.status, experiment.result);

  return (
    <article className="surface-card lift-on-hover flex flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={appPath(base, `/experiments/${experiment.id}`)}
              className="text-base font-semibold tracking-tight hover:text-[var(--accent)]"
            >
              {experiment.label}
            </Link>
            <p className="mt-1 text-caption line-clamp-2">
              {experiment.description ?? experiment.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge
              variant={experiment.status === "running" ? "warning" : "success"}
            >
              {experiment.status === "running" ? "Running" : "Completed"}
            </StatusBadge>
            <ExperimentRecommendationBadge recommendation={rec} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          {experiment.segment && <StatusBadge>{experiment.segment}</StatusBadge>}
          <span>
            {experiment.treatment_count + experiment.control_count} enrolled
          </span>
          <span>· Started {formatDate(experiment.started_at)}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-4">
        {experiment.result ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-3 py-2.5">
                <p className="text-label">Relative uplift</p>
                <p className="mt-1 text-stat text-[var(--success)]">
                  +{experiment.result.uplift_pct.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-3 py-2.5">
                <p className="text-label">Significance</p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    experiment.result.p_value < 0.05
                      ? "text-[var(--success)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {significanceLabel(experiment.result.p_value)}
                </p>
                <p className="text-xs tabular-nums text-[var(--muted)]">
                  p = {experiment.result.p_value.toFixed(3)}
                </p>
              </div>
            </div>

            <ExperimentChurnComparison result={experiment.result} />

            <p className="mt-4 text-caption">
              {upliftExplanation(experiment.result.uplift_pct)}
            </p>
            <p className="mt-2 text-caption">
              {significanceExplanation(experiment.result.p_value)}
            </p>
          </>
        ) : (
          <div className="flex flex-1 flex-col justify-center py-6 text-center">
            <p className="text-sm font-medium">Collecting outcomes</p>
            <p className="mt-1 text-caption">
              Treatment vs. control churn will be compared when the experiment
              ends. Continue monitoring enrollment balance.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] px-5 py-3">
        <Link
          href={appPath(base, `/experiments/${experiment.id}`)}
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          View full analysis →
        </Link>
      </div>
    </article>
  );
}

export { significanceLabel };
