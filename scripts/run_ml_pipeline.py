#!/usr/bin/env python3
"""
Train Cox survival model and upload predictions to Supabase.

Usage:
  python scripts/run_ml_pipeline.py
  python scripts/run_ml_pipeline.py --csv-only   # skip DB upload
  python scripts/run_ml_pipeline.py --replace    # delete existing predictions first
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
    args = parser.parse_args()

    print("Loading data...")
    features, predictions, metrics = run_training(prefer_postgres=True)

    print(f"  customers in training set: {len(features)}")
    print(f"  concordance index (C-index): {metrics['concordance_index']}")
    print(f"  median survival (KM, days): {metrics['median_survival_all']:.0f}")

    save_outputs(features, predictions)
    print("Saved data/synthetic/training_features.csv")
    print("Saved data/synthetic/survival_predictions.csv")

    risk = predictions["churn_risk_30d"]
    print(
        f"  30d churn risk — high (>0.6): {(risk > 0.6).sum()}, "
        f"medium (0.3–0.6): {((risk >= 0.3) & (risk <= 0.6)).sum()}, "
        f"low (<0.3): {(risk < 0.3).sum()}"
    )

    if not args.csv_only:
        print("Uploading predictions to Supabase...")
        upload_predictions(predictions, replace=args.replace)

    print("Done.")


if __name__ == "__main__":
    main()
