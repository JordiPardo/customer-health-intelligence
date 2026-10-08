"""
Estimate the causal effect of historical retention playbooks by segment.

Design (landmark analysis): playbooks were decided at day LANDMARK_DAYS after
signup. The population is every account still active at its landmark with a
full outcome window before the snapshot; covariates are what customer success
could see at the landmark; the outcome is churn within WINDOW_DAYS afterwards.

Estimator: augmented inverse-propensity weighting (AIPW, "doubly robust").
Riskier-looking accounts were more likely to receive playbooks, so a naive
treated-vs-untreated comparison is biased towards "the playbook increases
churn". AIPW combines a propensity model and an outcome model and is
consistent if either is correctly specified. 95% CIs come from a bootstrap.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

from ml.feature_engineering import CAUSAL_COVARIATES, PLAYBOOK_KEYS

DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"
SEGMENTS = ["SMB", "Mid-Market", "Enterprise"]

LANDMARK_DAYS = 90
WINDOW_DAYS = 180
BOOTSTRAP_ITERATIONS = 200
PROPENSITY_CLIP = (0.02, 0.98)
MIN_TREATED = 10


@dataclass(frozen=True)
class TreatmentSpec:
    key: str
    label: str
    description: str


TREATMENTS: list[TreatmentSpec] = [
    TreatmentSpec(
        key="proactive_success_call",
        label="Proactive success call",
        description="Dedicated CSM outreach for accounts with support friction and declining engagement.",
    ),
    TreatmentSpec(
        key="payment_recovery_workflow",
        label="Payment recovery workflow",
        description="Automated dunning and billing remediation after failed payments.",
    ),
    TreatmentSpec(
        key="onboarding_relaunch",
        label="Onboarding relaunch",
        description="Guided re-onboarding for early-tenure accounts with low product adoption.",
    ),
    TreatmentSpec(
        key="expansion_discount",
        label="Expansion discount",
        description="Short-term pricing relief for downgraded or declining-usage accounts.",
    ),
]
assert [t.key for t in TREATMENTS] == PLAYBOOK_KEYS


def _design_matrix(df: pd.DataFrame) -> np.ndarray:
    segments = pd.get_dummies(df["segment"]).reindex(columns=SEGMENTS[1:], fill_value=0)
    X = np.column_stack([df[CAUSAL_COVARIATES].to_numpy(float), segments.to_numpy(float)])
    return StandardScaler().fit_transform(X)


def _fit_predict(X: np.ndarray, y: np.ndarray, X_new: np.ndarray) -> np.ndarray:
    if len(np.unique(y)) < 2:
        return np.full(len(X_new), float(y.mean()) if len(y) else 0.0)
    model = LogisticRegression(C=10.0, max_iter=2000)
    model.fit(X, y)
    return model.predict_proba(X_new)[:, 1]


def aipw_scores(df: pd.DataFrame, treatment_col: str, outcome_col: str) -> np.ndarray:
    """Per-account doubly robust scores; their mean is the ATE (risk difference)."""
    X = _design_matrix(df)
    t = df[treatment_col].to_numpy(int)
    y = df[outcome_col].to_numpy(int)

    e = np.clip(_fit_predict(X, t, X), *PROPENSITY_CLIP)
    m1 = _fit_predict(X[t == 1], y[t == 1], X)
    m0 = _fit_predict(X[t == 0], y[t == 0], X)
    return (m1 - m0) + t * (y - m1) / e - (1 - t) * (y - m0) / (1 - e)


def _segment_effects(df: pd.DataFrame, key: str) -> dict[str, float]:
    """Churn reduction in percentage points per segment (positive = playbook helps)."""
    scores = aipw_scores(df, f"pb_{key}", "churned_in_window")
    return {
        seg: float(-scores[(df["segment"] == seg).to_numpy()].mean() * 100)
        for seg in SEGMENTS
        if (df["segment"] == seg).any()
    }


def naive_effect(df: pd.DataFrame, key: str, segment: str) -> float:
    seg = df[df["segment"] == segment]
    treated = seg[seg[f"pb_{key}"] == 1]["churned_in_window"]
    control = seg[seg[f"pb_{key}"] == 0]["churned_in_window"]
    if treated.empty or control.empty:
        return 0.0
    return float((control.mean() - treated.mean()) * 100)


def estimate_causal_effects(
    population: pd.DataFrame, *, n_boot: int = BOOTSTRAP_ITERATIONS, seed: int = 42
) -> pd.DataFrame:
    """
    Return one row per (treatment, segment) for the causal_estimates table,
    plus naive estimates and treated counts for the methodology report.
    """
    df = population.reset_index(drop=True)
    rng = np.random.default_rng(seed)
    boot_idx = [rng.integers(0, len(df), size=len(df)) for _ in range(n_boot)]

    rows: list[dict] = []
    for spec in TREATMENTS:
        point = _segment_effects(df, spec.key)
        boot: dict[str, list[float]] = {seg: [] for seg in SEGMENTS}
        for idx in boot_idx:
            sample = df.iloc[idx].reset_index(drop=True)
            for seg, value in _segment_effects(sample, spec.key).items():
                boot[seg].append(value)

        for segment in SEGMENTS:
            seg_df = df[df["segment"] == segment]
            treated = int(seg_df[f"pb_{spec.key}"].sum())
            if treated < MIN_TREATED or segment not in point:
                ate = lo = hi = 0.0
            else:
                ate = point[segment]
                lo, hi = np.percentile(boot[segment], [2.5, 97.5])
            rows.append(
                {
                    "organization_id": DEMO_ORG_ID,
                    "treatment": spec.key,
                    "segment": segment,
                    "ate": round(float(np.clip(ate, -99.99, 99.99)), 2),
                    "confidence_lower": round(float(np.clip(lo, -99.99, 99.99)), 2),
                    "confidence_upper": round(float(np.clip(hi, -99.99, 99.99)), 2),
                    "sample_size": len(seg_df),
                    "treated_count": treated,
                    "naive_ate": round(naive_effect(df, spec.key, segment), 2),
                }
            )

    return pd.DataFrame(rows)


def treatment_catalog() -> list[dict[str, str]]:
    return [{"key": t.key, "label": t.label, "description": t.description} for t in TREATMENTS]
