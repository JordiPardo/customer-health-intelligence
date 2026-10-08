"""
End-to-end training pipeline: load data → point-in-time features → out-of-time
backtest → refit on the latest cutoff → score today's active accounts.
"""

from __future__ import annotations

import json
import uuid
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from ml.data_loader import load_training_data
from ml.feature_engineering import (
    MODEL_FEATURES,
    prepare_frames,
    scoring_dataset,
    survival_dataset,
)
from ml.survival_model import (
    HORIZON_DAYS,
    coefficient_table,
    evaluate_out_of_time,
    predict_customer_risks,
    train_cox_model,
)

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "data" / "synthetic"
REPORT_PATH = OUTPUT_DIR / "model_report.json"

# Must match RISK_THRESHOLDS in lib/risk.ts (bands on 90-day churn risk).
RISK_THRESHOLDS = {"high": 0.15, "medium": 0.08}


def _true_coefficients() -> dict[str, float] | None:
    meta_path = OUTPUT_DIR / "metadata.json"
    if not meta_path.exists():
        return None
    return json.loads(meta_path.read_text()).get("true_coefficients")


def _month_end_before(d: date) -> date:
    """Last day of the month before d's month (cutoffs sit on month ends)."""
    return d.replace(day=1) - timedelta(days=1)


def cutoff_dates(snapshot: date) -> tuple[date, date]:
    """Latest cutoff with a full horizon before the snapshot, and the one before it."""
    latest = _month_end_before(snapshot - timedelta(days=HORIZON_DAYS - 2))
    earlier = _month_end_before(latest - timedelta(days=HORIZON_DAYS - 2))
    return earlier, latest


def run_training(*, prefer_postgres: bool = False) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    frames = prepare_frames(load_training_data(prefer_postgres=prefer_postgres))
    earlier, latest = cutoff_dates(frames.snapshot.date())

    backtest_train = survival_dataset(frames, earlier, HORIZON_DAYS)
    latest_train = survival_dataset(frames, latest, HORIZON_DAYS)

    # Honest performance: train on the earlier cutoff, test on the later one...
    backtest = evaluate_out_of_time(backtest_train, latest_train, MODEL_FEATURES)

    # ...then refit on the latest cutoff and score today's active accounts.
    cph = train_cox_model(latest_train, MODEL_FEATURES)
    scoring = scoring_dataset(frames)
    predictions = predict_customer_risks(cph, scoring, MODEL_FEATURES)
    predictions.insert(0, "id", [str(uuid.uuid4()) for _ in range(len(predictions))])

    risk_90d = predictions["churn_risk_90d"]
    high = risk_90d >= RISK_THRESHOLDS["high"]
    medium = (risk_90d >= RISK_THRESHOLDS["medium"]) & ~high
    metrics = {
        "model": "Cox proportional hazards (lifelines, Breslow baseline)",
        "features": MODEL_FEATURES,
        "snapshot_date": str(frames.snapshot.date()),
        "n_active_scored": len(predictions),
        "risk_bands": {
            "thresholds_90d": RISK_THRESHOLDS,
            "high": round(float(high.mean()), 3),
            "medium": round(float(medium.mean()), 3),
            "low": round(float((~high & ~medium).mean()), 3),
        },
        "backtest": backtest,
        "production_fit": {
            "cutoff": str(latest),
            "n": len(latest_train),
            "events": int(latest_train["event"].sum()),
        },
        "coefficients": coefficient_table(cph, _true_coefficients()),
    }
    return scoring, predictions, metrics


def save_outputs(features: pd.DataFrame, predictions: pd.DataFrame, metrics: dict) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    features.to_csv(OUTPUT_DIR / "training_features.csv", index=False)
    predictions.to_csv(OUTPUT_DIR / "survival_predictions.csv", index=False)
    REPORT_PATH.write_text(json.dumps(metrics, indent=2) + "\n")
