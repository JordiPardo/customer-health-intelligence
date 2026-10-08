"""
Guards against temporal leakage — the bugs that made the first version of the
model look far better than it was.
"""

from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
import pytest

from ml.data_loader import DATA_DIR, load_training_data
from ml.feature_engineering import (
    MODEL_FEATURES,
    _shrink_rates,
    features_as_of,
    prepare_frames,
    survival_dataset,
)

SNAPSHOT = "2025-04-30"


def _toy_data() -> dict[str, pd.DataFrame]:
    """Three accounts: one churned before the cutoff, one after, one active."""
    customers = pd.DataFrame(
        {
            "id": ["early", "late", "active"],
            "name": ["Early", "Late", "Active"],
            "mrr": [100.0, 200.0, 300.0],
            "segment": ["SMB", "SMB", "Mid-Market"],
            "plan_tier": ["Starter", "Starter", "Pro"],
            "industry": ["Retail"] * 3,
            "cohort_month": ["2024-01-01"] * 3,
            "signup_date": ["2024-01-10"] * 3,
        }
    )
    labels = pd.DataFrame(
        {
            "customer_id": ["early", "late", "active"],
            "snapshot_date": [SNAPSHOT] * 3,
            "churned": [True, True, False],
            "days_to_churn": [100, 300, None],  # 2024-04-19 and 2024-11-05
            "downgraded": [False] * 3,
        }
    )
    months = pd.date_range("2024-01-01", "2025-04-01", freq="MS")
    usage = pd.DataFrame(
        [
            {"customer_id": cid, "event_date": m.date().isoformat(), "event_type": "login", "event_count": 100 + i}
            for cid in ["late", "active"]
            for i, m in enumerate(months)
        ]
    )
    payments = pd.DataFrame(
        [
            {"customer_id": "late", "event_date": "2024-02-01", "event_type": "payment_success"},
            {"customer_id": "late", "event_date": "2024-09-01", "event_type": "payment_failed"},
        ]
    )
    support = pd.DataFrame(
        [
            {"customer_id": "late", "ticket_date": "2024-03-01", "sentiment": "positive"},
            {"customer_id": "late", "ticket_date": "2024-09-15", "sentiment": "negative"},
        ]
    )
    return {
        "customers": customers,
        "churn_labels": labels,
        "usage_events": usage,
        "payment_events": payments,
        "support_sentiment": support,
    }


def test_tenure_and_outcome_are_not_model_features():
    assert "tenure_days" not in MODEL_FEATURES
    assert "duration" not in MODEL_FEATURES
    assert "event" not in MODEL_FEATURES


def test_features_ignore_events_after_the_as_of_date():
    frames = prepare_frames(_toy_data())
    cutoff = pd.Timestamp("2024-06-30")
    feats = features_as_of(frames, pd.Series(cutoff, index=["late"])).iloc[0]

    assert feats["invoices"] == 1  # the September failure is in the future
    assert feats["raw_failure_share"] == 0.0
    assert feats["ticket_count"] == 1  # the September ticket is in the future
    assert feats["negative_tickets"] == 0


def test_partial_months_of_usage_are_not_visible():
    frames = prepare_frames(_toy_data())
    # June usage is only complete on June 30; as of June 15 the last full month is May.
    mid = features_as_of(frames, pd.Series(pd.Timestamp("2024-06-15"), index=["active"])).iloc[0]
    end = features_as_of(frames, pd.Series(pd.Timestamp("2024-06-30"), index=["active"])).iloc[0]
    assert mid["login_trend_raw"] != end["login_trend_raw"]


def test_survival_dataset_uses_only_accounts_active_at_cutoff():
    frames = prepare_frames(_toy_data())
    data = survival_dataset(frames, date(2024, 6, 30), horizon_days=180).set_index("customer_id")

    assert "early" not in data.index  # churned before the cutoff
    assert data.loc["late", "event"] == 1
    assert data.loc["late", "duration"] == (pd.Timestamp("2024-11-05") - pd.Timestamp("2024-06-30")).days
    assert data.loc["active", "event"] == 0
    assert data.loc["active", "duration"] == 180  # censored at the horizon


def test_shrinkage_pulls_sparse_accounts_towards_the_mean():
    successes = pd.Series([0, 1, 30, 1])
    trials = pd.Series([0, 1, 100, 10])
    shrunk = _shrink_rates(successes, trials)
    pooled = successes.sum() / trials.sum()

    assert shrunk.iloc[0] == pytest.approx(pooled)  # no data → prior mean
    assert abs(shrunk.iloc[1] - pooled) < abs(1.0 - pooled)  # 1/1 is pulled in
    assert shrunk.iloc[2] == pytest.approx(0.3, abs=0.05)  # lots of data → stays put


@pytest.mark.skipif(not (DATA_DIR / "customers.csv").exists(), reason="synthetic data not generated")
def test_synthetic_data_has_no_events_after_churn_or_snapshot():
    data = load_training_data(prefer_postgres=False)
    frames = prepare_frames(data)
    churned = frames.customers.dropna(subset=["churn_date"]).set_index("customer_id")

    assert (churned["churn_date"] <= frames.snapshot).all()

    usage = frames.usage.join(churned["churn_date"], on="customer_id", how="inner")
    assert (usage["event_date"] <= usage["churn_date"]).all()

    tickets = frames.support.join(churned["churn_date"], on="customer_id", how="inner")
    assert (tickets["ticket_date"] <= tickets["churn_date"]).all()
    assert np.isfinite(frames.customers["mrr"]).all()
