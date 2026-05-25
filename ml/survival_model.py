"""
Survival analysis: Cox proportional hazards and Kaplan-Meier utilities.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import numpy as np
import pandas as pd
from lifelines import CoxPHFitter, KaplanMeierFitter
from lifelines.utils import concordance_index


@dataclass
class SurvivalModelBundle:
    cox: CoxPHFitter
    feature_cols: list[str]
    concordance: float
    km_overall: KaplanMeierFitter


def train_cox_model(cox_df: pd.DataFrame, *, penalizer: float = 0.1) -> CoxPHFitter:
    cph = CoxPHFitter(penalizer=penalizer)
    cph.fit(cox_df, duration_col="duration", event_col="event")
    return cph


def fit_kaplan_meier(features: pd.DataFrame) -> KaplanMeierFitter:
    kmf = KaplanMeierFitter()
    kmf.fit(features["duration"], event_observed=features["event"], label="all_customers")
    return kmf


def train_survival_models(
    cox_df: pd.DataFrame, features: pd.DataFrame, feature_cols: list[str]
) -> SurvivalModelBundle:
    cph = train_cox_model(cox_df)
    kmf = fit_kaplan_meier(features)

    partial_hazard = cph.predict_partial_hazard(cox_df[feature_cols])
    c_index = concordance_index(
        cox_df["duration"],
        -partial_hazard.squeeze(),
        cox_df["event"],
    )

    return SurvivalModelBundle(
        cox=cph,
        feature_cols=feature_cols,
        concordance=float(c_index),
        km_overall=kmf,
    )


def _survival_at_times(
    cph: CoxPHFitter,
    X: pd.DataFrame,
    times: list[int],
    conditional_after: pd.Series | None = None,
) -> pd.DataFrame:
    if conditional_after is not None:
        return cph.predict_survival_function(
            X, times=times, conditional_after=conditional_after.values
        )
    return cph.predict_survival_function(X, times=times)


def _median_and_ci(
    cph: CoxPHFitter, row: pd.DataFrame, *, conditional_after: float = 0
) -> tuple[int | None, dict]:
    sf = cph.predict_survival_function(
        row, conditional_after=[conditional_after]
    ).squeeze()
    times = sf.index.values.astype(float)
    probs = sf.values.astype(float)

    def time_at_prob(p: float) -> float | None:
        below = probs <= p
        if not below.any():
            return None
        return float(times[np.argmax(below)])

    median = time_at_prob(0.5)
    p25 = time_at_prob(0.75)  # earlier time = higher survival
    p75 = time_at_prob(0.25)

    ci = {
        "median_days": int(median) if median is not None else None,
        "lower_days": int(p25) if p25 is not None else None,
        "upper_days": int(p75) if p75 is not None else None,
    }
    median_int = int(median) if median is not None else None
    return median_int, ci


def predict_customer_risks(
    bundle: SurvivalModelBundle,
    cox_df: pd.DataFrame,
    features: pd.DataFrame,
) -> pd.DataFrame:
    """
    Build survival_predictions rows for each customer.
    """
    X = cox_df[bundle.feature_cols]
    tenure = features["tenure_days"].astype(float)
    surv = _survival_at_times(bundle.cox, X, times=[30, 90], conditional_after=tenure)

    churn_30 = (1 - surv.loc[30]).clip(0, 1).values
    churn_90 = (1 - surv.loc[90]).clip(0, 1).values

    rows: list[dict] = []
    for i, (_, meta) in enumerate(features.iterrows()):
        row_x = X.iloc[[i]]
        median_days, ci = _median_and_ci(
            bundle.cox, row_x, conditional_after=float(meta["tenure_days"])
        )

        rows.append(
            {
                "customer_id": meta["customer_id"],
                "prediction_date": meta["snapshot_date"],
                "churn_risk_30d": round(float(churn_30[i]), 2),
                "churn_risk_90d": round(float(churn_90[i]), 2),
                "median_days_to_churn": median_days,
                "confidence_interval": json.dumps(ci),
            }
        )

    return pd.DataFrame(rows)


def summarize_model(bundle: SurvivalModelBundle) -> dict:
    return {
        "concordance_index": round(bundle.concordance, 3),
        "n_features": len(bundle.feature_cols),
        "median_survival_all": float(bundle.km_overall.median_survival_time_ or 0),
    }
