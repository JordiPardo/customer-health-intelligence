#!/usr/bin/env python3
"""
Estimate causal ATEs by segment and upload to causal_estimates.

Usage:
  python scripts/run_causal_pipeline.py
  python scripts/run_causal_pipeline.py --csv-only
  python scripts/run_causal_pipeline.py --replace
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

from ml.causal_model import estimate_causal_effects, treatment_catalog
from ml.data_loader import load_training_data
from ml.feature_engineering import build_customer_features


def upload_estimates(estimates: pd.DataFrame, *, replace: bool = False) -> None:
    import psycopg2
    from psycopg2.extras import execute_values

    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL not set — skipping upload.")
        return

    estimates = estimates.copy()
    estimates.insert(0, "id", [str(uuid.uuid4()) for _ in range(len(estimates))])

    columns = [
        "id",
        "organization_id",
        "treatment",
        "segment",
        "ate",
        "confidence_lower",
        "confidence_upper",
        "sample_size",
    ]
    values = [
        [
            row["id"],
            row["organization_id"],
            row["treatment"],
            row["segment"],
            float(row["ate"]),
            float(row["confidence_lower"]),
            float(row["confidence_upper"]),
            int(row["sample_size"]),
        ]
        for _, row in estimates.iterrows()
    ]

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            if replace:
                cur.execute(
                    "DELETE FROM causal_estimates WHERE organization_id = %s",
                    (estimates.iloc[0]["organization_id"],),
                )
                print("  Cleared existing causal_estimates for demo org.")

            execute_values(
                cur,
                f"""
                INSERT INTO causal_estimates
                  ({", ".join(columns)})
                VALUES %s
                """,
                values,
                page_size=50,
            )
        conn.commit()

    print(f"  causal_estimates: {len(values)} rows uploaded")


def main() -> None:
    parser = argparse.ArgumentParser(description="Estimate causal ATEs and upload")
    parser.add_argument("--csv-only", action="store_true", help="Skip Supabase upload")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace existing demo org causal estimates",
    )
    args = parser.parse_args()

    print("Loading data...")
    data = load_training_data(prefer_postgres=True)
    features = build_customer_features(data)
    labels = (
        data["churn_labels"]
        .sort_values("snapshot_date")
        .groupby("customer_id", as_index=False)
        .tail(1)
    )
    features = features.merge(
        labels[["customer_id", "churned"]],
        on="customer_id",
        how="left",
    )
    features["churned"] = features["churned"].fillna(0).astype(int)

    print(f"  customers in feature set: {len(features)}")
    print("Estimating causal effects (OLS-adjusted + bootstrap)...")
    estimates = estimate_causal_effects(features)

    out_dir = ROOT / "data" / "synthetic"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "causal_estimates.csv"
    estimates.to_csv(out_path, index=False)
    print(f"Saved {out_path}")

    print("\nTreatment catalog:")
    for t in treatment_catalog():
        print(f"  - {t['key']}: {t['label']}")

    print("\nATE summary (pp churn reduction when treated):")
    for treatment in estimates["treatment"].unique():
        sub = estimates[estimates["treatment"] == treatment]
        print(f"  {treatment}:")
        for _, row in sub.iterrows():
            print(
                f"    {row['segment']}: {row['ate']:+.2f}pp "
                f"[{row['confidence_lower']:.2f}, {row['confidence_upper']:.2f}] "
                f"n={row['sample_size']}"
            )

    if not args.csv_only:
        print("\nUploading to Supabase...")
        upload_estimates(estimates, replace=args.replace)

    print("Done.")


if __name__ == "__main__":
    main()
