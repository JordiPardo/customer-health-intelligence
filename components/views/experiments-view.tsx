import Link from "next/link";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import { ExperimentCards } from "@/components/experiments/experiment-cards";
import { ExperimentList } from "@/components/experiments/experiment-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AppBase } from "@/lib/app-path";
import { getExperiments } from "@/lib/queries/experiments";

export async function ExperimentsView({ base = "" }: { base?: AppBase }) {
  const experiments = await getExperiments();
  const completed = experiments.filter((e) => e.status === "completed").length;
  const running = experiments.filter((e) => e.status === "running").length;

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Experiments"
        description="Randomized A/B tests that validate retention playbooks. Executive summary cards plus detailed comparison table."
        meta={
          <>
            <StatusBadge>{experiments.length} total</StatusBadge>
            <StatusBadge variant="success">{completed} completed</StatusBadge>
            {running > 0 && (
              <StatusBadge variant="warning">{running} running</StatusBadge>
            )}
          </>
        }
        actions={
          <Link
            href={base ? `${base}/playbooks` : "/playbooks"}
            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--border-subtle)]"
          >
            View playbooks →
          </Link>
        }
      />

      {experiments.length === 0 ? (
        <EmptyState
          title="No experiments yet"
          description="Run python scripts/run_experiments_pipeline.py --replace to seed A/B validation data."
        />
      ) : (
        <>
          <div className="animate-fade-up">
            <ExperimentCards experiments={experiments} base={base} />
          </div>

          <Card
            interactive
            className="animate-fade-up"
          >
            <CardHeader>
              <CardTitle subtitle="Compact view for comparing all experiments">
                Summary table
              </CardTitle>
            </CardHeader>
            <CardContent noPadding>
              <ExperimentList experiments={experiments} base={base} />
            </CardContent>
          </Card>

          <div className="animate-fade-up rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border-subtle)] px-5 py-4 text-caption">
            <strong className="font-medium text-[var(--foreground)]">
              Decision framework:
            </strong>{" "}
            <span className="text-[var(--success)]">Roll out</span> when uplift is
            positive and p &lt; 0.05.{" "}
            <span className="text-[var(--warning)]">Continue testing</span> when
            signal is promising but inconclusive or the experiment is still
            running. <span className="text-[var(--danger)]">Stop</span> when
            treatment underperforms control. Always cross-check observational ATEs
            on the{" "}
            <Link
              href={base ? `${base}/playbooks` : "/playbooks"}
              className="text-[var(--accent)] hover:underline"
            >
              playbooks
            </Link>{" "}
            page.
          </div>
        </>
      )}
    </div>
  );
}
