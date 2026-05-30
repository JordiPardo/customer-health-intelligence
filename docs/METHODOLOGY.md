# Methodology

This document summarizes the analytics approach. The public case study lives at **`/methodology`**.

## Business question

Which accounts will churn, **when**, and **which retention actions actually work** for each segment?

## Dataset

- **500 synthetic B2B accounts** across SMB, Mid-Market, Enterprise
- Telemetry: usage, billing, support sentiment, churn labels
- Planted cohort anomaly (Aug 2024) for dashboard alerts
- Reproducible seed (`scripts/generate_synthetic_data.py`, seed=42)

## Survival analysis (Phase 2)

**Model:** Cox proportional hazards (`ml/survival_model.py`, lifelines)

**Why not a classifier?** CS teams schedule outreach by **time horizon**. Survival models output:

- 30-day and 90-day churn probability
- Median days to churn
- Confidence intervals on the survival curve

**Features:** tenure, usage trends, billing friction, segment, plan tier (via `ml/feature_engineering.py`).

## Cohort intelligence

Dashboard aggregates churn by signup cohort and compares to expected baselines. Anomalies surface in `cohort_anomalies` for executive review.

## Causal playbooks (Phase 4)

**Goal:** Rank retention interventions by estimated impact.

**Method:** Observational proxies assign “treated” accounts per playbook (e.g. payment failures → payment recovery workflow). OLS-adjusted ATE with bootstrap 95% CIs (`ml/causal_model.py`).

**Interpretation:**

| ATE sign | Meaning | UI label |
|----------|---------|----------|
| Positive | Lower churn (good) | Recommended / Needs validation |
| Zero / negative | No benefit or harmful | Do not roll out |

Logic: `lib/playbook-recommendation.ts`

## A/B experiments (Phase 5)

Randomized treatment/control assignments with simulated outcomes (`scripts/run_experiments_pipeline.py`).

**Decision rules** (`lib/experiment-recommendation.ts`):

- **Roll out** — completed, positive uplift, p < 0.05
- **Continue testing** — running or inconclusive
- **Stop** — treatment underperforms control

## Limitations

- Synthetic data; not calibrated to a real product
- Observational ATEs can be confounded — experiments are required before rollout
- Single demo org; not production multi-tenant security
- Manual pipeline runs; no automated retraining

## With real SaaS data

1. Connect CRM + product analytics (Segment, Stripe, Zendesk)
2. Per-tenant RLS and org isolation
3. Scheduled model retraining on live churn outcomes
4. Experiment assignment service integrated with CS workflows
