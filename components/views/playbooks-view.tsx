import { PlaybookTable } from "@/components/playbooks/playbook-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getPlaybooks } from "@/lib/queries/playbooks";

export async function PlaybooksView() {
  const playbooks = await getPlaybooks();

  const segments = ["SMB", "Mid-Market", "Enterprise"] as const;
  const bySegment = segments.map((segment) => ({
    segment,
    rows: playbooks.filter((p) => p.segment === segment),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Retention playbooks"
        description="Causal average treatment effects (ATE) by segment from OLS-adjusted observational data. Positive values suggest lower churn among treated proxies."
      />

      {playbooks.length === 0 ? (
        <EmptyState
          title="No causal estimates yet"
          description="Run python scripts/run_causal_pipeline.py --replace to populate playbook data."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle subtitle="All segment × treatment combinations">
                All estimates
              </CardTitle>
            </CardHeader>
            <CardContent noPadding>
              <PlaybookTable rows={playbooks} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {bySegment.map(({ segment, rows }) => (
              <Card key={segment}>
                <CardHeader>
                  <CardTitle subtitle="Ranked by estimated churn reduction">
                    {segment}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rows.length > 0 ? (
                    <ul className="space-y-3">
                      {rows.map((row, i) => (
                        <li
                          key={row.id}
                          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] px-3.5 py-3"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium">
                              {i + 1}. {row.label}
                            </span>
                            <span
                              className={`shrink-0 text-xs font-medium tabular-nums ${
                                row.ate > 0
                                  ? "text-[var(--success)]"
                                  : "text-[var(--muted)]"
                              }`}
                            >
                              {row.ate > 0
                                ? `−${row.ate.toFixed(1)}pp`
                                : `${row.ate.toFixed(1)}pp`}
                            </span>
                          </div>
                          <p className="mt-1 text-caption">{row.action}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-caption">No estimates for this segment.</p>
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
