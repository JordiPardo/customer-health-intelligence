import Link from "next/link";
import { notFound } from "next/navigation";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import {
  ExperimentChurnComparison,
  formatDate,
  significanceLabel,
} from "@/components/experiments/experiment-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
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

  return (
    <div className="space-y-6">
      <PageToolbar
        title={experiment.label}
        description={experiment.description ?? meta?.description ?? experiment.name}
        badge={
          <StatusBadge
            variant={experiment.status === "running" ? "warning" : "success"}
          >
            {experiment.status === "running" ? "Running" : "Completed"}
          </StatusBadge>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Treatment arm"
          value={experiment.treatment_count}
          hint="accounts"
        />
        <MetricCard
          label="Control arm"
          value={experiment.control_count}
          hint="accounts"
        />
        {experiment.result ? (
          <>
            <MetricCard
              label="Relative uplift"
              value={`+${experiment.result.uplift_pct.toFixed(1)}%`}
              trend="positive"
              hint="churn reduction"
            />
            <MetricCard
              label="p-value"
              value={experiment.result.p_value.toFixed(3)}
              hint={significanceLabel(experiment.result.p_value)}
            />
          </>
        ) : (
          <>
            <MetricCard label="Relative uplift" value="—" hint="Pending" />
            <MetricCard label="p-value" value="—" hint="Pending" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
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

        <Card>
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
        <Card>
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
                {experiment.result.p_value < 0.05
                  ? "Statistically significant at α=0.05 — strong evidence the playbook moved retention in this cohort."
                  : "Not significant at α=0.05 — consider longer runtime or larger sample before rollout."}
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
