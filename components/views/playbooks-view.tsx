import { PlaybookTable } from "@/components/playbooks/playbook-table";
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
      <div>
        <h1 className="mb-1">Retention playbooks</h1>
        <p className="max-w-2xl text-base text-[var(--muted)]">
          Causal average treatment effects (ATE) by segment from OLS-adjusted
          observational data. Positive values suggest lower churn among treated
          proxies; validate with Phase 5 experiments before rolling out broadly.
        </p>
      </div>

      {playbooks.length === 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-base text-amber-900">
          Run the causal pipeline to populate estimates:{" "}
          <code className="text-[13px]">
            python scripts/run_causal_pipeline.py --replace
          </code>
        </section>
      ) : (
        <>
          <section className="rounded-lg border border-[var(--border)] bg-white p-5">
            <h2 className="mb-4">All estimates</h2>
            <PlaybookTable rows={playbooks} />
          </section>

          {bySegment.map(({ segment, rows }) => (
            <section
              key={segment}
              className="rounded-lg border border-[var(--border)] bg-white p-5"
            >
              <h2 className="mb-2">{segment}</h2>
              <p className="mb-4 text-[13px] text-[var(--muted)]">
                Ranked by estimated churn reduction. Use on customer detail pages
                for this segment.
              </p>
              {rows.length > 0 ? (
                <ul className="space-y-3">
                  {rows.map((row, i) => (
                    <li
                      key={row.id}
                      className="rounded-md border border-[var(--border)] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">
                          {i + 1}. {row.label}
                        </span>
                        <span className="text-[13px] text-[var(--success)]">
                          {row.ate > 0
                            ? `−${row.ate.toFixed(1)}pp churn`
                            : `${row.ate.toFixed(1)}pp`}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-[var(--muted)]">
                        {row.action}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-[var(--muted)]">
                  No estimates for this segment.
                </p>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
