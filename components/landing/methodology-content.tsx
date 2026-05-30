import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/landing/public-header";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  {
    id: "problem",
    title: "The business problem",
    body: [
      "B2B SaaS teams lose revenue when accounts churn quietly. Sales sees a healthy logo; finance sees a missed renewal two weeks later.",
      "Most teams react with a binary churn label (“at risk” / “healthy”) and a generic outreach list. That misses two questions that matter for retention: when is churn likely, and which intervention actually works for this segment?",
      "Customer Health Intelligence is a portfolio demo that answers both — using survival analysis for timing and causal + experimental methods for action.",
    ],
  },
  {
    id: "data",
    title: "Synthetic dataset (500 accounts)",
    body: [
      "The demo uses a reproducible synthetic B2B portfolio: 500 customers across SMB, Mid-Market, and Enterprise segments with MRR, cohort month, usage events, billing events, support sentiment, and churn outcomes.",
      "Data is scoped to a demo organization in Supabase. It is designed to look like real SaaS telemetry — not random noise — including a planted cohort anomaly (Aug 2024) and realistic churn rate (~18%).",
      "Synthetic data keeps the project shareable without exposing real customer PII, while still exercising the full analytics pipeline end to end.",
    ],
  },
  {
    id: "survival",
    title: "Why survival analysis vs. a churn classifier?",
    body: [
      "A classifier asks: “Will this account churn?” A survival model asks: “When, and with what uncertainty?”",
      "Customer Success teams schedule outreach based on time — not just a score. Survival analysis (Cox proportional hazards in this demo) estimates the probability of retaining an account over time, producing 30-day and 90-day risk and a median days-to-churn estimate with confidence intervals.",
      "That maps directly to workflow: prioritize accounts with high near-term risk and shrinking confidence windows, not just accounts that might churn “someday.”",
    ],
  },
  {
    id: "cox",
    title: "Cox model — intuition without the math exam",
    body: [
      "The Cox model learns which account features accelerate or delay churn while allowing each customer’s baseline hazard to differ.",
      "In plain terms: it ranks drivers of time-to-churn (usage trends, billing friction, tenure, segment) and converts them into a survival curve per account.",
      "Outputs in the app: 30d / 90d churn probability, median days to churn, and a confidence band on the survival chart. Wider bands = less historical signal — an honest representation of uncertainty.",
    ],
  },
  {
    id: "cohorts",
    title: "Cohort anomaly detection",
    body: [
      "Aggregate churn can hide cohort-level problems. The dashboard compares observed cohort churn to expected baselines and flags deviations.",
      "When a signup cohort underperforms (e.g. a bad onboarding release month), CS and Product can investigate root cause instead of treating it as random noise.",
      "This is operational intelligence — the kind of metric VPs of Customer Success review weekly.",
    ],
  },
  {
    id: "causal",
    title: "Causal playbooks",
    body: [
      "Knowing who is at risk is not enough. Teams need prioritized actions. The playbooks page estimates Average Treatment Effects (ATE) for retention interventions by segment — e.g. proactive success calls, payment recovery, onboarding relaunch.",
      "ATE is expressed in percentage points of churn reduction. Negative impact (higher churn) is explicitly labeled “Do not roll out.” Positive impact with a tight confidence interval is “Recommended”; positive but uncertain is “Needs validation.”",
      "These are observational estimates (OLS-adjusted with bootstrap CIs) — useful for hypothesis generation, not automatic rollout.",
    ],
  },
  {
    id: "experiments",
    title: "A/B validation",
    body: [
      "Observational causal estimates can be confounded (healthier accounts may already receive more outreach). Randomized experiments remove that bias.",
      "The experiments module shows treatment vs. control churn, relative uplift, p-values in plain language, and a recommendation: roll out, continue testing, or stop.",
      "Together, playbooks + experiments mirror how mature growth/CS teams work: observational signal → experiment → decision.",
    ],
  },
  {
    id: "limits",
    title: "Limitations & next steps with real data",
    body: [
      "Synthetic data and a single demo org simplify the story. Real deployments need: CRM/product analytics connectors, per-tenant isolation with strict RLS, model retraining on live outcomes, and experiment assignment infrastructure.",
      "Causal estimates here use OLS proxies — production systems might add propensity scoring, diff-in-diff, or instrumental variables where appropriate.",
      "This project demonstrates product thinking and engineering tradeoffs for a portfolio — not a finished enterprise data platform.",
    ],
  },
];

export function MethodologyContent() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <PublicHeader active="methodology" />

      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
            <p className="text-label mb-3">Case study</p>
            <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              How this demo models customer retention
            </h1>
            <p className="text-base leading-relaxed text-[var(--muted)]">
              A walkthrough of the business problem, modeling choices, and how
              analytics translate into actions a Customer Success team would
              actually take.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/demo/dashboard">
                <Button>View live demo</Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary">Create account</Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-6 py-10">
          <nav className="mb-10 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border-subtle)] p-4">
            <p className="text-label mb-2">On this page</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                  {section.title}
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
