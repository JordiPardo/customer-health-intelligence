"""
End-to-end training pipeline: load data → features → Cox model → predictions.
"""

from __future__ import annotations

import uuid
from pathlib import Path

import pandas as pd

from ml.data_loader import load_training_data
from ml.feature_engineering import build_customer_features, prepare_cox_matrix
from ml.survival_model import predict_customer_risks, summarize_model, train_survival_models

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "data" / "synthetic"


def run_training(*, prefer_postgres: bool = True) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    data = load_training_data(prefer_postgres=prefer_postgres)
    features = build_customer_features(data)
    cox_df, feature_cols = prepare_cox_matrix(features)

    bundle = train_survival_models(cox_df, features, feature_cols)
    predictions = predict_customer_risks(bundle, cox_df, features)
    predictions.insert(0, "id", [str(uuid.uuid4()) for _ in range(len(predictions))])

    metrics = summarize_model(bundle)
    return features, predictions, metrics


def save_outputs(features: pd.DataFrame, predictions: pd.DataFrame) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    features.to_csv(OUTPUT_DIR / "training_features.csv", index=False)
    predictions.to_csv(OUTPUT_DIR / "survival_predictions.csv", index=False)
