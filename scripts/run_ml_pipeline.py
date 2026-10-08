#!/usr/bin/env python3
"""
Train Cox survival model and upload predictions to Supabase.

Usage:
  python scripts/run_ml_pipeline.py
  python scripts/run_ml_pipeline.py --csv-only   # skip DB upload
  python scripts/run_ml_pipeline.py --replace    # delete existing predictions first
  python scripts/run_ml_pipeline.py --from-db    # train from Supabase tables instead of CSV
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

from ml.train_models import run_training, save_outputs


def upload_predictions(predictions, *, replace: bool = False) -> None:
    import psycopg2
    from psycopg2.extras import execute_values

    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL not set — skipping upload.")
        return

    rows = predictions.copy()
    rows["confidence_interval"] = rows["confidence_interval"].apply(
        lambda v: json.loads(v) if isinstance(v, str) else v
    )

    columns = [
        "id",
        "customer_id",
        "prediction_date",
        "churn_risk_30d",
        "churn_risk_90d",
        "median_days_to_churn",
        "confidence_interval",
    ]
    values = [
        [
            row["id"],
            row["customer_id"],
            row["prediction_date"],
            float(row["churn_risk_30d"]),
            float(row["churn_risk_90d"]),
            None if pd.isna(row["median_days_to_churn"]) else int(row["median_days_to_churn"]),
            json.dumps(row["confidence_interval"]),
        ]
        for _, row in rows.iterrows()
    ]

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            if replace:
                cur.execute("DELETE FROM survival_predictions")
                print("  Cleared existing survival_predictions rows.")

            execute_values(
                cur,
                f"""
                INSERT INTO survival_predictions
                  ({", ".join(columns)})
                VALUES %s
                ON CONFLICT (customer_id, prediction_date) DO UPDATE SET
                  churn_risk_30d = EXCLUDED.churn_risk_30d,
                  churn_risk_90d = EXCLUDED.churn_risk_90d,
                  median_days_to_churn = EXCLUDED.median_days_to_churn,
                  confidence_interval = EXCLUDED.confidence_interval
                """,
                values,
                page_size=200,
            )
        conn.commit()

    print(f"  survival_predictions: {len(values)} rows uploaded")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train survival model and upload predictions")
    parser.add_argument(
        "--csv-only",
        action="store_true",
        help="Save CSV outputs only, do not upload to Supabase",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace existing predictions in Supabase",
    )
    parser.add_argument(
        "--from-db",
        action="store_true",
        help="Read training data from Supabase instead of data/synthetic/*.csv",
    )
    args = parser.parse_args()

    print("Training (cutoff design, out-of-time backtest)...")
    features, predictions, metrics = run_training(prefer_postgres=args.from_db)

    backtest = metrics["backtest"]
    print(
        f"  backtest: train cutoff {backtest['train_cutoff']} "
        f"({backtest['n_train']} accounts, {backtest['events_train']} churns) → "
        f"test cutoff {backtest['test_cutoff']} ({backtest['n_test']} accounts, "
        f"{backtest['events_test']} churns)"
    )
    print(f"  C-index: train {backtest['c_index_train']} · out-of-time test {backtest['c_index_test']}")
    for horizon, scores in backtest["brier"].items():
        print(
            f"  Brier@{horizon}d: model {scores['model']} vs Kaplan-Meier {scores['km_baseline']} "
            f"(skill {scores['skill']})"
        )
    print(f"  churners captured in top 20% risk: {backtest['top_20pct_churn_capture']:.0%}")
    print("  coefficients (estimate [95% CI] · true):")
    for row in metrics["coefficients"]:
        print(
            f"    {row['feature']:<24} {row['estimate']:>7} "
            f"[{row['ci_lower']}, {row['ci_upper']}] · {row['true']}"
        )

    save_outputs(features, predictions, metrics)
    print("Saved data/synthetic/training_features.csv, survival_predictions.csv, model_report.json")

    bands = metrics["risk_bands"]
    print(
        f"  {len(predictions)} active accounts scored · 90d risk bands — "
        f"high {bands['high']:.0%}, medium {bands['medium']:.0%}, low {bands['low']:.0%}"
    )

    if not args.csv_only:
        print("Uploading predictions to Supabase...")
        upload_predictions(predictions, replace=args.replace)

    print("Done.")


if __name__ == "__main__":
    main()
