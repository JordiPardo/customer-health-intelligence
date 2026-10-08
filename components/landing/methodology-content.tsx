import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/landing/public-header";
import { Button } from "@/components/ui/button";

import causalReport from "@/data/synthetic/causal_report.json";
import metadata from "@/data/synthetic/metadata.json";
import modelReport from "@/data/synthetic/model_report.json";

const backtest = modelReport.backtest;
const vsTruth = causalReport.vs_truth;
const pct = (value: number) => `${(value * 100).toFixed(0)}%`;

const FEATURE_LABELS: Record<string, string> = {
  login_trend: "Login trend (monthly log-change)",
  log_early_logins: "Early engagement (log logins, first 3 months)",
  payment_failure_rate: "Payment failure rate",
  negative_sentiment_rate: "Negative support-ticket share",
  downgraded: "Downgraded plan",
  log_mrr: "log MRR",
  log_tenure: "log tenure at cutoff",
};

const TREATMENT_LABELS: Record<string, string> = {
  proactive_success_call: "Proactive success call",
  payment_recovery_workflow: "Payment recovery",
  onboarding_relaunch: "Onboarding relaunch",
  expansion_discount: "Expansion discount",
};

type Section = { id: string; title: string; body: string[]; evidence?: "model" | "causal" };

const SECTIONS: Section[] = [
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
    title: `Synthetic dataset with a known ground truth (${metadata.num_customers.toLocaleString("en-US")} accounts)`,
    body: [
      `The demo uses a reproducible synthetic B2B portfolio: ${metadata.num_customers.toLocaleString("en-US")} accounts across SMB, Mid-Market and Enterprise with MRR, signup cohort, monthly usage, invoices, support tickets and churn outcomes (${pct(metadata.observed_churn_rate)} churned by the ${metadata.snapshot_date} snapshot).`,
      "The data is not random noise: churn times are drawn from a Weibull proportional-hazards model with known coefficients, events stop when an account churns, accounts that have not churned yet are right-censored at the snapshot, and one signup cohort (Aug 2024) carries extra hidden risk.",
      "Because the true data-generating process is known, every model below can be checked against the truth — something real data never allows.",
    ],
  },
  {
    id: "survival",
    title: "Why survival analysis vs. a churn classifier?",
    body: [
      "A classifier asks: “Will this account churn?” A survival model asks: “When, and how likely within a given horizon?”",
      "Customer Success teams schedule outreach based on time. A Cox proportional hazards model turns account signals into 30-day and 90-day churn probabilities and churn-timing quantiles for every active account.",
      "Accounts are banded on 90-day risk relative to the portfolio baseline (≈7%): high ≥ 15%, medium ≥ 8%. “Expected MRR at risk” weights each account's MRR by its churn probability instead of counting whole accounts.",
    ],
  },
  {
    id: "cox",
    title: "Leak-free design and out-of-time validation",
    body: [
      "Every feature is computed as of a cutoff date using only events visible on that date. The model learns “days from cutoff to churn” over the next 180 days, so nothing from the future can leak into the features.",
      "Noisy per-account signals (login trend, payment failure rate, ticket sentiment) are shrunk towards the population average with empirical Bayes. Without it, accounts with little history add measurement error that biases hazard ratios towards zero.",
      `Validation is a backtest: the model is trained on accounts active on ${backtest.train_cutoff} and evaluated on accounts active on ${backtest.test_cutoff}, i.e. on a later period it never saw. It reaches a C-index of ${backtest.c_index_test.toFixed(2)} and the riskiest 20% of accounts contain ${pct(backtest.top_20pct_churn_capture)} of the churners.`,
    ],
    evidence: "model",
  },
  {
    id: "cohorts",
    title: "Cohort anomaly detection",
    body: [
      "Aggregate churn can hide cohort-level problems. The dashboard compares each signup cohort's churn in its first 90 days — a window every mature cohort has completed — against the pooled baseline.",
      "A cohort is flagged only when its deviation is statistically large for its size (binomial z-score), so small cohorts are not flagged on noise. The planted Aug 2024 cohort is detected from observed outcomes alone.",
    ],
  },
  {
    id: "causal",
    title: "Causal playbooks",
    body: [
      `Knowing who is at risk is not enough. The playbooks page estimates the effect of four historical retention playbooks, decided at day ${causalReport.design.landmark_days} after signup, on churn over the following ${causalReport.design.outcome_window_days} days.`,
      "Customer success gave playbooks to the accounts that looked riskiest, so comparing treated vs. untreated accounts is biased. The estimator is AIPW (augmented inverse-propensity weighting, “doubly robust”): it combines a model of who gets treated with a model of the outcome, adjusting for everything CS could see at decision time. 95% CIs come from a bootstrap.",
      vsTruth
        ? `Against the known truth, the naive comparison is off by ${vsTruth.mean_abs_error_naive} percentage points on average, AIPW by ${vsTruth.mean_abs_error_aipw}, and the AIPW intervals contain the true effect in ${pct(vsTruth.ci_coverage)} of cells. Estimates whose interval crosses zero are labelled “Needs validation”.`
        : "Estimates whose interval crosses zero are labelled “Needs validation”.",
    ],
    evidence: "causal",
  },
  {
    id: "experiments",
    title: "A/B validation",
    body: [
      "Even good observational estimates rest on assumptions (no unmeasured confounding). Randomized experiments remove that dependence.",
      "The experiments module shows treatment vs. control churn, relative uplift, p-values in plain language, and a recommendation: roll out, continue testing, or stop.",
      "Together, playbooks + experiments mirror how mature growth/CS teams work: observational signal → experiment → decision.",
    ],
  },
  {
    id: "limits",
    title: "Limitations & next steps with real data",
    body: [
      "Synthetic data with static customer traits makes the story clean; real behaviour drifts. A time-varying Cox model (monthly covariate updates) and scheduled retraining would be the next step with live data.",
      "The A/B experiment results are simulated, and the demo has a single organization; production would need CRM/product analytics connectors, per-tenant isolation with strict RLS, and an assignment service integrated with CS workflows.",
      "This project demonstrates product thinking and modelling tradeoffs for a portfolio — not a finished enterprise data platform.",
    ],
  },
];

function EvidenceTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <figure className="mt-5">
      <div className="surface-card overflow-x-auto">
        <table className="table-shell w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {head.map((h, i) => (
                <th key={h} className={`px-3 py-2 ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join("|")} className="border-b border-[var(--border)] last:border-0">
                {row.map((cell, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 ${i > 0 ? "text-right tabular-nums" : "text-[var(--foreground)]"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-2 text-caption">{caption}</figcaption>
    </figure>
  );
}

function ModelEvidence() {
  return (
    <>
      <EvidenceTable
        caption={`Out-of-time backtest: ${backtest.n_train.toLocaleString("en-US")} accounts / ${backtest.events_train} churns for training, ${backtest.n_test.toLocaleString("en-US")} accounts / ${backtest.events_test} churns for testing. Brier skill = improvement over a Kaplan-Meier baseline that predicts the same risk for everyone.`}
        head={["Metric", "Train", "Out-of-time test"]}
        rows={[
          ["C-index (ranking quality, 0.5 = random)", backtest.c_index_train.toFixed(3), backtest.c_index_test.toFixed(3)],
          ["Brier skill at 90 days", "", `${(backtest.brier["90"].skill * 100).toFixed(1)}%`],
          ["Brier skill at 180 days", "", `${(backtest.brier["180"].skill * 100).toFixed(1)}%`],
          ["Churners found in top 20% risk", "", pct(backtest.top_20pct_churn_capture)],
        ]}
      />
      <EvidenceTable
        caption="Calibration on the test period: mean predicted 180-day churn vs. Kaplan-Meier observed churn, by predicted-risk quintile."
        head={["Risk quintile", "Accounts", "Predicted", "Observed"]}
        rows={backtest.calibration.map((c) => [`Q${c.group}`, c.n, pct(c.predicted), pct(c.observed)])}
      />
      <EvidenceTable
        caption="Estimated log hazard ratios (production fit) vs. the coefficients used to generate the data. Every true value lies inside its 95% confidence interval. Tenure has no single true coefficient (it enters through the Weibull baseline)."
        head={["Feature", "Estimate", "95% CI", "True"]}
        rows={modelReport.coefficients.map((c) => [
          FEATURE_LABELS[c.feature] ?? c.feature,
          c.estimate.toFixed(2),
          `${c.ci_lower.toFixed(2)} to ${c.ci_upper.toFixed(2)}`,
          c.true == null ? "—" : c.true.toFixed(2),
        ])}
      />
    </>
  );
}

function CausalEvidence() {
  const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
  return (
    <EvidenceTable
      caption={`Churn reduction in percentage points over ${causalReport.design.outcome_window_days} days (positive = playbook helps). ${causalReport.design.population.toLocaleString("en-US")} accounts in the causal population.`}
      head={["Playbook · segment", "Treated", "Naive", "AIPW [95% CI]", "True"]}
      rows={causalReport.estimates.map((e) => [
        `${TREATMENT_LABELS[e.treatment] ?? e.treatment} · ${e.segment}`,
        e.treated_count,
        signed(e.naive_ate),
        `${signed(e.ate)} [${e.confidence_lower.toFixed(1)}, ${e.confidence_upper.toFixed(1)}]`,
        e.true_ate == null ? "—" : signed(e.true_ate),
      ])}
    />
  );
}

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
                {section.evidence === "model" && <ModelEvidence />}
                {section.evidence === "causal" && <CausalEvidence />}
              </section>
            ))}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
