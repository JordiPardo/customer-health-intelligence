const CAPABILITIES = [
  {
    title: "Churn risk scoring",
    description:
      "30- and 90-day survival probabilities with confidence intervals per account.",
    icon: "risk",
  },
  {
    title: "Cohort analytics",
    description:
      "Track retention by signup cohort and flag deviations from expected churn.",
    icon: "cohort",
  },
  {
    title: "Account intelligence",
    description:
      "Searchable portfolio with MRR, segment, days-to-churn, and usage signals.",
    icon: "accounts",
  },
  {
    title: "Causal playbooks",
    description:
      "Segment-level treatment effects to prioritize interventions that move retention.",
    icon: "playbooks",
  },
];

const WORKFLOW = [
  { step: "01", title: "Ingest accounts", detail: "Connect CRM or seed synthetic portfolio data." },
  { step: "02", title: "Run survival model", detail: "Cox PH estimates time-to-churn per customer." },
  { step: "03", title: "Monitor cohorts", detail: "Dashboard surfaces risk mix and anomalies." },
  { step: "04", title: "Act on playbooks", detail: "Deploy treatments ranked by causal ATE." },
];

const METRICS = [
  { value: "500+", label: "Accounts per workspace" },
  { value: "30d", label: "Forward-looking risk window" },
  { value: "12", label: "Causal playbook estimates" },
  { value: "<2s", label: "Dashboard load time" },
];

export function LandingSections() {
  return (
    <>
      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className="text-center sm:text-left">
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-[var(--foreground)]">
                {m.value}
              </p>
              <p className="mt-0.5 text-caption">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--background)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-label mb-2">Platform</p>
          <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            One workspace for customer health
          </h2>
          <p className="mb-10 max-w-2xl text-caption">
            Revenue and customer success teams use a single analytics surface to
            prioritize retention work—not scattered spreadsheets.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="surface-card-interactive flex gap-4 p-5"
              >
                <CapabilityIcon type={cap.icon} />
                <div>
                  <h3 className="mb-1">{cap.title}</h3>
                  <p className="text-caption">{cap.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--surface-muted)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-label mb-2">Workflow</p>
          <h2 className="mb-10 text-2xl font-semibold tracking-tight sm:text-3xl">
            From data to intervention
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((item) => (
              <div
                key={item.step}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
              >
                <span className="text-label">{item.step}</span>
                <h3 className="mt-2 mb-1.5">{item.title}</h3>
                <p className="text-caption">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--background)] py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="surface-card flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2 className="mb-2 text-xl font-semibold tracking-tight">
                Explore with synthetic data
              </h2>
              <p className="max-w-md text-caption">
                500 customers, survival predictions, and causal playbooks—no
                signup required for the read-only demo.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/demo/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--border-subtle)]"
              >
                Open demo
              </a>
              <a href="/signup" className="btn-brand text-sm">
                Start free trial
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CapabilityIcon({ type }: { type: string }) {
  const className = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--border-subtle)] text-[var(--muted)]";
  if (type === "risk") {
    return (
      <div className={className} aria-hidden>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      </div>
    );
  }
  if (type === "cohort") {
    return (
      <div className={className} aria-hidden>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 5 5-9" />
        </svg>
      </div>
    );
  }
  if (type === "accounts") {
    return (
      <div className={className} aria-hidden>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      </div>
    );
  }
  return (
    <div className={className} aria-hidden>
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    </div>
  );
}
