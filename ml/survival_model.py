"""
Survival analysis: Cox proportional hazards on a cutoff design, out-of-time
evaluation, and per-customer risk scores.

Design: take every account active on a cutoff date, compute its features as
of that date, and model the time from the cutoff to churn over the next
HORIZON_DAYS. Scores for today's accounts are P(churn within 30 / 90 days).
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
from lifelines import CoxPHFitter, KaplanMeierFitter
from lifelines.utils import concordance_index

HORIZON_DAYS = 180
PENALIZER = 0.01
EVAL_HORIZONS = (90, 180)
CALIBRATION_GROUPS = 5
TOP_SHARE = 0.2  # "how many churners are in the top 20% riskiest accounts?"


def train_cox_model(
    df: pd.DataFrame, feature_cols: list[str], *, penalizer: float = PENALIZER
) -> CoxPHFitter:
    cph = CoxPHFitter(penalizer=penalizer)
    cph.fit(df[["duration", "event"] + feature_cols], duration_col="duration", event_col="event")
    return cph


def _km(durations: pd.Series, events: pd.Series, label: str) -> KaplanMeierFitter:
    return KaplanMeierFitter().fit(durations, event_observed=events, label=label)


def survival_at(cph: CoxPHFitter, X: pd.DataFrame, times: np.ndarray) -> np.ndarray:
    """S(t | x) for each row of X (rows) and time (columns), using the Breslow baseline."""
    base = cph.baseline_cumulative_hazard_.iloc[:, 0]
    idx = np.searchsorted(base.index.values, times, side="right") - 1
    h0 = np.where(idx >= 0, base.values[np.clip(idx, 0, None)], 0.0)
    ph = cph.predict_partial_hazard(X).to_numpy().reshape(-1, 1)
    return np.exp(-h0.reshape(1, -1) * ph)


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------


def ipcw_brier_score(
    durations: np.ndarray,
    events: np.ndarray,
    surv_at_t: np.ndarray,
    t: float,
    censoring_km: KaplanMeierFitter,
) -> float:
    """Time-dependent Brier score at t with inverse-probability-of-censoring weights."""

    def g(times: np.ndarray) -> np.ndarray:
        return np.clip(censoring_km.survival_function_at_times(times).to_numpy(), 1e-6, None)

    died = (durations <= t) & (events == 1)
    alive = durations > t
    score = np.zeros_like(surv_at_t)
    score[died] = surv_at_t[died] ** 2 / g(np.maximum(durations[died] - 1e-9, 0))
    score[alive] = (1 - surv_at_t[alive]) ** 2 / g(np.array([t]))[0]
    return float(score.mean())


def evaluate_out_of_time(
    train: pd.DataFrame, test: pd.DataFrame, feature_cols: list[str]
) -> dict:
    """Fit on an earlier cutoff, evaluate on a later one (a true backtest)."""
    cph = train_cox_model(train, feature_cols)

    def c_index(frame: pd.DataFrame) -> float:
        risk = cph.predict_partial_hazard(frame[feature_cols])
        return float(concordance_index(frame["duration"], -risk, frame["event"]))

    durations = test["duration"].to_numpy(dtype=float)
    events = test["event"].to_numpy(dtype=int)
    censoring_km = _km(test["duration"], 1 - test["event"], "censoring")
    km_train = _km(train["duration"], train["event"], "train")

    brier = {}
    for t in EVAL_HORIZONS:
        surv_model = survival_at(cph, test[feature_cols], np.array([t]))[:, 0]
        surv_null = np.full_like(surv_model, float(km_train.survival_function_at_times(t).iloc[0]))
        model_bs = ipcw_brier_score(durations, events, surv_model, t, censoring_km)
        null_bs = ipcw_brier_score(durations, events, surv_null, t, censoring_km)
        brier[str(t)] = {
            "model": round(model_bs, 4),
            "km_baseline": round(null_bs, 4),
            "skill": round(1 - model_bs / null_bs, 3) if null_bs > 0 else None,
        }

    # Calibration: mean predicted vs Kaplan-Meier observed risk by risk quintile.
    pred_risk = 1 - survival_at(cph, test[feature_cols], np.array([HORIZON_DAYS]))[:, 0]
    groups = pd.qcut(pred_risk, CALIBRATION_GROUPS, labels=False, duplicates="drop")
    calibration = []
    for grp in sorted(np.unique(groups)):
        mask = groups == grp
        km = _km(test["duration"][mask], test["event"][mask], f"q{grp}")
        calibration.append(
            {
                "group": int(grp) + 1,
                "n": int(mask.sum()),
                "predicted": round(float(pred_risk[mask].mean()), 3),
                "observed": round(float(1 - km.survival_function_at_times(HORIZON_DAYS).iloc[0]), 3),
            }
        )

    # Business view: share of churners found by working the top 20% riskiest accounts.
    top = pred_risk >= np.quantile(pred_risk, 1 - TOP_SHARE)
    captured = events[top].sum() / max(events.sum(), 1)

    return {
        "train_cutoff": str(train["as_of"].iloc[0]),
        "test_cutoff": str(test["as_of"].iloc[0]),
        "horizon_days": HORIZON_DAYS,
        "n_train": len(train),
        "n_test": len(test),
        "events_train": int(train["event"].sum()),
        "events_test": int(events.sum()),
        "c_index_train": round(c_index(train), 3),
        "c_index_test": round(c_index(test), 3),
        "brier": brier,
        "calibration": calibration,
        "top_20pct_churn_capture": round(float(captured), 3),
    }


def coefficient_table(cph: CoxPHFitter, true_coefs: dict[str, float] | None) -> list[dict]:
    summary = cph.summary
    return [
        {
            "feature": feature,
            "estimate": round(float(summary.loc[feature, "coef"]), 3),
            "ci_lower": round(float(summary.loc[feature, "coef lower 95%"]), 3),
            "ci_upper": round(float(summary.loc[feature, "coef upper 95%"]), 3),
            "hazard_ratio": round(float(np.exp(summary.loc[feature, "coef"])), 3),
            "true": None if true_coefs is None else true_coefs.get(feature),
        }
        for feature in cph.params_.index
    ]


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def _time_to_survival(surv_row: np.ndarray, grid: np.ndarray, p: float) -> int | None:
    below = np.nonzero(surv_row <= p)[0]
    return int(grid[below[0]]) if below.size else None


def predict_customer_risks(
    cph: CoxPHFitter, scoring: pd.DataFrame, feature_cols: list[str]
) -> pd.DataFrame:
    """
    survival_predictions rows for currently active accounts. Churn-time
    quantiles are only reported inside the modelled horizon; beyond it they
    are null ("more than HORIZON_DAYS days").
    """
    grid = np.arange(1, HORIZON_DAYS + 1, dtype=float)
    surv = survival_at(cph, scoring[feature_cols], grid)

    rows: list[dict] = []
    for i, (_, row) in enumerate(scoring.iterrows()):
        interval = {
            "lower_days": _time_to_survival(surv[i], grid, 0.75),
            "median_days": _time_to_survival(surv[i], grid, 0.5),
            "upper_days": _time_to_survival(surv[i], grid, 0.25),
            "horizon_days": HORIZON_DAYS,
        }
        rows.append(
            {
                "customer_id": row["customer_id"],
                "prediction_date": row["as_of"],
                "churn_risk_30d": round(float(1 - surv[i, 29]), 2),
                "churn_risk_90d": round(float(1 - surv[i, 89]), 2),
                "median_days_to_churn": interval["median_days"],
                "confidence_interval": json.dumps(interval),
            }
        )

    return pd.DataFrame(rows)
