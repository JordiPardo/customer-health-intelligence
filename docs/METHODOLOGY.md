# Methodology

This document summarizes the analytics approach. The public case study lives at **`/methodology`** and renders the live numbers from `data/synthetic/model_report.json` and `causal_report.json`.

## Business question

Which accounts will churn, **when**, and **which retention actions actually work** for each segment?

## Dataset: synthetic, with a known ground truth

`scripts/generate_synthetic_data.py` (seed 42) builds 3,000 B2B accounts (SMB, Mid-Market, Enterprise) over 24 monthly signup cohorts, with a snapshot on 2025-04-30.

The generative process is explicit so that every model can be checked against the truth:

1. Each account gets latent traits: usage trend, engagement level, billing friction, support negativity.
2. Churn time is drawn from a **Weibull proportional-hazards model** with known coefficients (`TRUE_COEFS`). Accounts that have not churned by the snapshot are **right-censored**.
3. Usage, invoices and tickets are only generated while the account is active: nothing after churn, nothing after the snapshot.
4. At day 90, customer success decides on retention playbooks **using only what it can see then** (early logins, early billing failures, negative tickets). Riskier-looking accounts are treated more often (confounding by indication). Each playbook has a known true effect.
5. The Aug 2024 cohort carries extra hidden risk (planted anomaly).

`metadata.json` stores the true coefficients and the true playbook effects (exact counterfactuals obtained by replaying each account's random draw with and without the playbook).

## Survival model

**Design:** take every account active on a cutoff date, compute features **as of that date** (`ml/feature_engineering.py`), and model days from cutoff to churn over the next 180 days with a Cox proportional hazards model (`ml/survival_model.py`, lifelines, Breslow baseline).

**Why this design:**

- Using tenure as a covariate while the time axis is tenure leaks the target (for active accounts tenure *equals* the censored duration). On the cutoff design the time axis is "days since cutoff", so tenure at the cutoff is a legitimate covariate.
- Features computed over each account's whole history give short-lived churners noisy, uninformative features. This is differential measurement error, and it pulled the login-trend coefficient to almost zero. With point-in-time features the error no longer depends on the outcome.
- Noisy per-account rates are replaced by **empirical-Bayes posterior means**: beta-binomial for payment failures and ticket sentiment, normal-normal for the login trend. This is regression calibration, and it removes most of the attenuation bias.

**Validation:** out-of-time backtest. Train on accounts active on 2024-04-30, test on accounts active on 2024-10-31. Reported in `model_report.json`:

- C-index (train vs out-of-time test)
- IPCW Brier score at 90 and 180 days vs a Kaplan-Meier baseline (Brier skill)
- Calibration by predicted-risk quintile (mean predicted vs Kaplan-Meier observed)
- Share of churners in the top 20% riskiest accounts
- Coefficients with 95% CIs vs the true coefficients

**Scoring:** the production model is refit on the latest cutoff and scores accounts active at the snapshot. Outputs are 30-day and 90-day churn probabilities, plus the days until churn probability reaches 25% / 50% / 75%. Quantiles beyond the 180-day horizon are reported as ">180".

**Risk bands** use 90-day risk relative to the ≈7% portfolio baseline: high ≥ 15%, medium ≥ 8% (`lib/risk.ts`). "Expected MRR at risk" weights each account's MRR by its 90-day churn probability.

## Cohort intelligence

Cohorts are compared on churn within their **first 90 days**, a window every mature cohort has completed, so old and young cohorts line up. A cohort is flagged when its 90-day churn exceeds the pooled baseline with a one-sided binomial z-score ≥ 1.5 (low), 2 (medium) or 3 (high).

## Causal playbooks

**Design (landmark analysis):** the population is accounts active at day 90 with a full 180-day outcome window before the snapshot. Covariates are measured as of day 90. The outcome is churn within the next 180 days.

**Estimator:** AIPW, augmented inverse-propensity weighting, also called "doubly robust" (`ml/causal_model.py`). It combines a logistic propensity model and per-arm logistic outcome models, with propensities clipped to [0.02, 0.98]. Segment ATEs are averages of the per-account scores, and 95% CIs come from 200 bootstrap resamples. The report also includes the **naive** treated-vs-untreated difference, for comparison with the truth.

| ATE sign / CI | UI label |
|---------------|----------|
| CI entirely above 0 | Recommended |
| Positive, CI crosses 0 | Needs validation |
| Zero or negative | Do not roll out |

Logic: `lib/playbook-recommendation.ts`

## A/B experiments

Randomized treatment/control assignments among active accounts, with **simulated** outcomes (`scripts/run_experiments_pipeline.py`).

**Decision rules** (`lib/experiment-recommendation.ts`):

- **Roll out**: completed, positive uplift, p < 0.05
- **Continue testing**: running or inconclusive
- **Stop**: treatment underperforms control

## Tests

`ml/tests/test_leakage.py` guards the properties above:

- Tenure and the outcome are not model features.
- Features ignore events after the as-of date, including partial usage months.
- The survival dataset only contains accounts active at the cutoff.
- Shrinkage pulls sparse accounts towards the mean.
- The generated data has no events after churn and no churn after the snapshot.

## Limitations

- Customer traits are static in the simulation; real behaviour drifts. A time-varying Cox model with monthly covariate updates and scheduled retraining would be the next step on live data.
- AIPW assumes no unmeasured confounding. That holds by construction here but is untestable on real data, so experiments are still required before rollout.
- A/B outcomes are simulated, and there is a single demo org rather than production multi-tenant security.

## With real SaaS data

1. Connect CRM + product analytics (Segment, Stripe, Zendesk) and build the same point-in-time feature tables.
2. Per-tenant RLS and org isolation.
3. Scheduled backtests and retraining on live churn outcomes.
4. An experiment assignment service integrated with CS workflows.
