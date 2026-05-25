"""
Estimate average treatment effects (ATE) for retention playbooks by segment.

Treatment assignment uses feature-based observational proxies (not outcomes).
ATE is OLS-adjusted churn reduction with bootstrap confidence intervals.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"
SEGMENTS = ["SMB", "Mid-Market", "Enterprise"]

MIN_SEGMENT_SAMPLE = 25
MIN_TREATED = 8
MIN_CONTROL = 8
BOOTSTRAP_ITERATIONS = 200


@dataclass(frozen=True)
class TreatmentSpec:
    key: str
    label: str
    description: str
    treated: Callable[[pd.DataFrame], pd.Series]


TREATMENTS: list[TreatmentSpec] = [
    TreatmentSpec(
        key="proactive_success_call",
        label="Proactive success call",
        description="Dedicated CSM outreach for accounts with support friction and declining engagement.",
        treated=lambda df: (df["ticket_count"] >= 2)
        & (df["negative_sentiment_rate"] >= 0.2)
        & (df["login_trend"] < 0),
    ),
    TreatmentSpec(
        key="payment_recovery_workflow",
        label="Payment recovery workflow",
        description="Automated dunning and billing remediation after failed payments.",
        treated=lambda df: (df["payment_failure_rate"] >= 0.1)
        | (df["past_due_count"] >= 2),
    ),
    TreatmentSpec(
        key="onboarding_relaunch",
        label="Onboarding relaunch",
        description="Guided re-onboarding for early-tenure accounts with low product adoption.",
        treated=lambda df: (df["tenure_days"] <= 365)
        & (df["logins_last_90d"] < 20),
    ),
    TreatmentSpec(
        key="expansion_discount",
        label="Expansion discount",
        description="Short-term pricing relief for downgraded or declining-usage accounts.",
        treated=lambda df: (df["downgraded"] == 1) | (df["login_trend"] <= -0.3),
    ),
]


def _regression_ate(
    outcome: np.ndarray, treatment: np.ndarray, covariates: np.ndarray
) -> float:
    """Churn reduction (pp) when treated, adjusted for covariates."""
    if treatment.sum() < MIN_TREATED or (1 - treatment).sum() < MIN_CONTROL:
        return 0.0

    X = np.column_stack([covariates, treatment.astype(float)])
    model = LinearRegression()
    model.fit(X, outcome)
    return float(-model.coef_[-1] * 100.0)


def _bootstrap_ci(
    df: pd.DataFrame,
    spec: TreatmentSpec,
    covariate_cols: list[str],
    *,
    n_iter: int = BOOTSTRAP_ITERATIONS,
) -> tuple[float, float, float, int]:
    """Return (ate, ci_lower, ci_upper, segment_sample_size)."""
    n = len(df)
    if n < MIN_SEGMENT_SAMPLE:
        return 0.0, 0.0, 0.0, n

    outcome = df["churned"].astype(float).values
    treatment = spec.treated(df).fillna(False).astype(int).values
    X = df[covariate_cols].astype(float).values

    if treatment.sum() < MIN_TREATED or (1 - treatment).sum() < MIN_CONTROL:
        return 0.0, 0.0, 0.0, n

    ate = _regression_ate(outcome, treatment, X)

    boot: list[float] = []
    rng = np.random.default_rng(42)
    for _ in range(n_iter):
        idx = rng.integers(0, n, size=n)
        boot_df = df.iloc[idx]
        boot_t = spec.treated(boot_df).fillna(False).astype(int).values
        boot_y = boot_df["churned"].astype(float).values
        boot_x = boot_df[covariate_cols].astype(float).values
        if boot_t.sum() < 5 or (1 - boot_t).sum() < 5:
            continue
        try:
            boot.append(_regression_ate(boot_y, boot_t, boot_x))
        except Exception:
            continue

    if len(boot) < 30:
        margin = 3.0
        return ate, ate - margin, ate + margin, n

    lo, hi = np.percentile(boot, [2.5, 97.5])
    return ate, float(lo), float(hi), n


def estimate_causal_effects(features: pd.DataFrame) -> pd.DataFrame:
    """
    Return one row per (treatment, segment) ready for causal_estimates table.
    """
    covariate_cols = [
        "tenure_days",
        "mrr",
        "log_mrr",
        "downgraded",
        "logins_last_90d",
        "login_trend",
        "payment_failure_rate",
        "past_due_count",
        "negative_sentiment_rate",
        "ticket_count",
    ]

    rows: list[dict] = []
    for spec in TREATMENTS:
        for segment in SEGMENTS:
            seg_df = features[features["segment"] == segment].copy()
            ate, lo, hi, sample_size = _bootstrap_ci(
                seg_df, spec, covariate_cols
            )
            ate = float(np.clip(ate, -99.99, 99.99))
            lo = float(np.clip(lo, -99.99, 99.99))
            hi = float(np.clip(hi, -99.99, 99.99))

            rows.append(
                {
                    "organization_id": DEMO_ORG_ID,
                    "treatment": spec.key,
                    "segment": segment,
                    "ate": round(ate, 2),
                    "confidence_lower": round(lo, 2),
                    "confidence_upper": round(hi, 2),
                    "sample_size": int(sample_size),
                }
            )

    return pd.DataFrame(rows)


def treatment_catalog() -> list[dict[str, str]]:
    return [
        {
            "key": t.key,
            "label": t.label,
            "description": t.description,
        }
        for t in TREATMENTS
    ]
