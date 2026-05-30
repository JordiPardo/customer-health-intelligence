import Link from "next/link";
import { PlaybookTable } from "@/components/playbooks/playbook-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageToolbar, StatusBadge } from "@/components/app/page-toolbar";
import { PlaybookRecommendationBadge } from "@/components/ui/recommendation-badge";
import { getPlaybooks } from "@/lib/queries/playbooks";
import {
  formatChurnImpact,
  playbookRecommendation,
  recommendedPlaybooks,
} from "@/lib/playbook-recommendation";

import { type AppBase } from "@/lib/app-path";

export async function PlaybooksView({ base = "" }: { base?: AppBase }) {
  const playbooks = await getPlaybooks();
  const beneficialCount = playbooks.filter((p) => p.ate > 0).length;

  const segments = ["SMB", "Mid-Market", "Enterprise"] as const;
  const bySegment = segments.map((segment) => ({
    segment,
    rows: recommendedPlaybooks(playbooks.filter((p) => p.segment === segment)),
  }));

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Retention playbooks"
        question="Which interventions actually reduce churn?"
        description="Causal effect estimates by segment, with harmful treatments flagged. Validate the promising ones with experiments before rollout."
        meta={
          <>
            <StatusBadge>{playbooks.length} estimates</StatusBadge>
            <StatusBadge variant="success">{beneficialCount} beneficial</StatusBadge>
            <StatusBadge>3 segments</StatusBadge>
          </>
        }
        actions={
          <Link
            href={base ? `${base}/experiments` : "/experiments"}
            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--border-subtle)]"
          >
            View experiments →
          </Link>
        }
      />

      <div className="animate-fade-up rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border-subtle)] px-5 py-4 text-caption">
        <strong className="font-medium text-[var(--foreground)]">
          How to read ATE:
        </strong>{" "}
        Average Treatment Effect is in percentage points of churn.{" "}
        <span className="text-[var(--success)]">Lower churn (good)</span>{" "}
        means the treatment group retained better (positive ATE).{" "}
        <span className="text-[var(--danger)]">Higher churn (bad)</span>{" "}
        means the treatment hurt retention — do not deploy. Validate promising
        playbooks with randomized experiments before broad rollout.
      </div>

      {playbooks.length === 0 ? (
        <EmptyState
          title="No causal estimates yet"
          description="Run python scripts/run_causal_pipeline.py --replace to populate playbook data."
        />
      ) : (
        <>
          <Card interactive className="animate-fade-up">
            <CardHeader>
              <CardTitle subtitle="All segment × treatment combinations with recommendation labels">
                All estimates
              </CardTitle>
            </CardHeader>
            <CardContent noPadding>
              <PlaybookTable rows={playbooks} />
            </CardContent>
          </Card>

          <div
            className="grid animate-fade-up gap-6 lg:grid-cols-3"
            style={{ animationDelay: "80ms" }}
          >
            {bySegment.map(({ segment, rows }) => (
              <Card key={segment} interactive>
                <CardHeader>
                  <CardTitle subtitle="Beneficial treatments only, ranked by impact">
                    {segment} — top actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rows.length > 0 ? (
                    <ul className="space-y-3">
                      {rows.map((row, i) => {
                        const rec = playbookRecommendation(row);
                        return (
                          <li
                            key={row.id}
                            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-3.5 py-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                {i + 1}. {row.label}
                              </span>
                              <PlaybookRecommendationBadge recommendation={rec} />
                            </div>
                            <p
                              className={`mt-1 text-xs font-medium tabular-nums ${
                                row.ate > 0
                                  ? "text-[var(--success)]"
                                  : "text-[var(--danger)]"
                              }`}
                            >
                              {formatChurnImpact(row.ate)}
                            </p>
                            <p className="mt-1 text-caption">{row.action}</p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-caption">
                      No beneficial estimates for this segment — review full table
                      above.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
