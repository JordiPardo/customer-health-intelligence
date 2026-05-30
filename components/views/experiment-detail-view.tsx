import Link from "next/link";
import { notFound } from "next/navigation";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import {
  ExperimentChurnComparison,
  formatDate,
} from "@/components/experiments/experiment-list";
import { ExperimentRecommendationBadge } from "@/components/ui/recommendation-badge";
import {
  experimentRecommendation,
  significanceExplanation,
  significanceLabel,
} from "@/lib/experiment-recommendation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { appPath, type AppBase } from "@/lib/app-path";
import { getExperimentById } from "@/lib/queries/experiments";
import { PLAYBOOK_META } from "@/lib/playbooks";

export async function ExperimentDetailView({
  id,
  base = "",
}: {
  id: string;
  base?: AppBase;
}) {
  const experiment = await getExperimentById(id);

  if (!experiment) {
    notFound();
  }

  const meta = experiment.treatment
    ? PLAYBOOK_META[experiment.treatment]
    : undefined;
  const rec = experimentRecommendation(experiment.status, experiment.result);

  return (
    <div className="space-y-6">
      <PageToolbar
        title={experiment.label}
        description={experiment.description ?? meta?.description ?? experiment.name}
        badge={
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge
              variant={experiment.status === "running" ? "warning" : "success"}
            >
              {experiment.status === "running" ? "Running" : "Completed"}
            </StatusBadge>
            <ExperimentRecommendationBadge recommendation={rec} />
          </div>
        }
        meta={
          <>
            {experiment.segment && (
              <StatusBadge>{experiment.segment}</StatusBadge>
            )}
            <StatusBadge>
              {experiment.treatment_count + experiment.control_count} enrolled
            </StatusBadge>
            <span className="text-xs text-[var(--muted)]">
              Started {formatDate(experiment.started_at)}
              {experiment.ended_at
                ? ` · Ended ${formatDate(experiment.ended_at)}`
                : " · In progress"}
            </span>
          </>
        }
        actions={
          <Link
            href={appPath(base, "/experiments")}
            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--border-subtle)]"
          >
            ← All experiments
          </Link>
        }
      />

      <section className="hero-surface animate-fade-up px-6 py-6 sm:px-8 sm:py-7">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-label">Experiment result</span>
              <ExperimentRecommendationBadge recommendation={rec} />
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-5">
              {experiment.result ? (
                <>
                  <div>
                    <p className="text-label mb-1.5">Relative uplift</p>
                    <p
                      className={`text-display ${
                        experiment.result.uplift_pct >= 0
                          ? "text-[var(--success)]"
                          : "text-[var(--danger)]"
                      }`}
                    >
                      {experiment.result.uplift_pct >= 0 ? "+" : ""}
                      {experiment.result.uplift_pct.toFixed(1)}%
                    </p>
                    <p className="mt-1.5 text-caption">
                      Churn reduction vs. control
                    </p>
                  </div>
                  <div className="pb-1">
                    <p className="text-label mb-1.5">Significance</p>
                    <p
                      className={`text-stat ${
                        experiment.result.p_value < 0.05
                          ? "text-[var(--success)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {significanceLabel(experiment.result.p_value)}
                    </p>
                    <p className="mt-1.5 text-caption">
                      p = {experiment.result.p_value.toFixed(3)}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-label mb-1.5">Enrollment</p>
                  <p className="text-display">
                    {experiment.treatment_count + experiment.control_count}
                  </p>
                  <p className="mt-1.5 text-caption">
                    Collecting outcomes — results pending
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:border-l lg:border-[var(--border)] lg:pl-10">
            <p className="text-label mb-3">Test arms</p>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--muted)]">Treatment</dt>
                <dd className="font-medium tabular-nums">
                  {experiment.treatment_count.toLocaleString()}
                  {experiment.result && (
                    <span className="ml-2 text-[var(--muted)]">
                      {(experiment.result.treatment_churn_rate * 100).toFixed(1)}%
                      churn
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--muted)]">Control</dt>
                <dd className="font-medium tabular-nums">
                  {experiment.control_count.toLocaleString()}
                  {experiment.result && (
                    <span className="ml-2 text-[var(--muted)]">
                      {(experiment.result.control_churn_rate * 100).toFixed(1)}%
                      churn
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div
        className="grid animate-fade-up gap-4 lg:grid-cols-2"
        style={{ animationDelay: "60ms" }}
      >
        <Card interactive>
          <CardHeader>
            <CardTitle subtitle="Observed churn rate by arm">
              Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {experiment.result ? (
              <ExperimentChurnComparison result={experiment.result} />
            ) : (
              <EmptyState
                title="Experiment still running"
                description="Results will be computed when the experiment ends and outcomes are measured."
              />
            )}
          </CardContent>
        </Card>

        <Card interactive>
          <CardHeader>
            <CardTitle subtitle="Playbook under test">
              Intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {meta ? (
              <>
                <p className="text-sm text-[var(--foreground)]">{meta.description}</p>
                <p className="text-caption">
                  <span className="font-medium text-[var(--foreground)]">Action: </span>
                  {meta.action}
                </p>
              </>
            ) : (
              <p className="text-caption">{experiment.name}</p>
            )}
            {experiment.treatment && (
              <Link
                href={appPath(base, "/playbooks")}
                className="inline-block text-xs font-medium text-[var(--accent)] hover:underline"
              >
                Compare observational ATE on playbooks →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {experiment.result && (
        <Card interactive className="animate-fade-up">
          <CardHeader>
            <CardTitle subtitle="Treatment vs. control interpretation">
              Analysis notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-caption">
              <li>
                Treatment churn:{" "}
                {(experiment.result.treatment_churn_rate * 100).toFixed(1)}% vs.
                control {(experiment.result.control_churn_rate * 100).toFixed(1)}%
              </li>
              <li>
                Randomization removes confounding present in observational causal
                estimates — use both signals before scaling interventions.
              </li>
              <li>
                {significanceExplanation(experiment.result.p_value)}
              </li>
              <li>
                Recommendation:{" "}
                {rec === "roll_out"
                  ? "Roll out to eligible accounts in this segment."
                  : rec === "stop"
                    ? "Stop the treatment — control outperformed or matched treatment."
                    : "Continue testing until sample size and runtime criteria are met."}
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
