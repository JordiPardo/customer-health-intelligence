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
import json
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

from ml.causal_model import (
    LANDMARK_DAYS,
    WINDOW_DAYS,
    estimate_causal_effects,
    treatment_catalog,
)
from ml.data_loader import load_training_data
from ml.feature_engineering import landmark_dataset, prepare_frames


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


def build_report(estimates: pd.DataFrame, population: pd.DataFrame) -> dict:
    """Naive vs doubly robust vs ground truth (when the synthetic truth is available)."""
    rows = estimates.drop(columns=["organization_id"]).to_dict(orient="records")
    report: dict = {
        "design": {
            "landmark_days": LANDMARK_DAYS,
            "outcome_window_days": WINDOW_DAYS,
            "population": len(population),
            "outcome_rate": round(float(population["churned_in_window"].mean()), 3),
            "estimator": "AIPW (doubly robust), 95% bootstrap CI",
        },
        "estimates": rows,
    }

    meta_path = ROOT / "data" / "synthetic" / "metadata.json"
    if meta_path.exists():
        truth = {
            (r["treatment"], r["segment"]): r["true_ate_pp"]
            for r in json.loads(meta_path.read_text()).get("true_playbook_effects", [])
        }
        estimable = [r for r in rows if r["treated_count"] > 0 and r["confidence_upper"] != r["confidence_lower"]]
        for r in rows:
            r["true_ate"] = truth.get((r["treatment"], r["segment"]))
        if estimable:
            report["vs_truth"] = {
                "cells": len(estimable),
                "mean_abs_error_naive": round(
                    sum(abs(r["naive_ate"] - truth[(r["treatment"], r["segment"])]) for r in estimable)
                    / len(estimable),
                    2,
                ),
                "mean_abs_error_aipw": round(
                    sum(abs(r["ate"] - truth[(r["treatment"], r["segment"])]) for r in estimable)
                    / len(estimable),
                    2,
                ),
                "ci_coverage": round(
                    sum(
                        r["confidence_lower"] <= truth[(r["treatment"], r["segment"])] <= r["confidence_upper"]
                        for r in estimable
                    )
                    / len(estimable),
                    3,
                ),
            }
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Estimate causal ATEs and upload")
    parser.add_argument("--csv-only", action="store_true", help="Skip Supabase upload")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace existing demo org causal estimates",
    )
    parser.add_argument(
        "--from-db",
        action="store_true",
        help="Read data from Supabase instead of data/synthetic/*.csv",
    )
    args = parser.parse_args()

    print("Loading data...")
    frames = prepare_frames(load_training_data(prefer_postgres=args.from_db))
    population = landmark_dataset(frames, LANDMARK_DAYS, WINDOW_DAYS)
    print(
        f"  causal population: {len(population)} accounts active at day {LANDMARK_DAYS} "
        f"with a full {WINDOW_DAYS}-day outcome window"
    )

    print("Estimating causal effects (AIPW + bootstrap)...")
    estimates = estimate_causal_effects(population)

    out_dir = ROOT / "data" / "synthetic"
    out_dir.mkdir(parents=True, exist_ok=True)
    estimates.to_csv(out_dir / "causal_estimates.csv", index=False)
    report = build_report(estimates, population)
    (out_dir / "causal_report.json").write_text(json.dumps(report, indent=2) + "\n")
    print("Saved data/synthetic/causal_estimates.csv and causal_report.json")

    print("\nTreatment catalog:")
    for t in treatment_catalog():
        print(f"  - {t['key']}: {t['label']}")

    print("\nATE summary (pp churn reduction; naive in brackets):")
    for row in report["estimates"]:
        truth = f" · true {row['true_ate']:+.2f}" if row.get("true_ate") is not None else ""
        print(
            f"  {row['treatment']:<26} {row['segment']:<11} {row['ate']:+6.2f}pp "
            f"[{row['confidence_lower']:.2f}, {row['confidence_upper']:.2f}] "
            f"(naive {row['naive_ate']:+.2f}){truth}"
        )
    if "vs_truth" in report:
        v = report["vs_truth"]
        print(
            f"\nvs ground truth: mean abs error naive {v['mean_abs_error_naive']}pp, "
            f"AIPW {v['mean_abs_error_aipw']}pp, CI coverage {v['ci_coverage']:.0%}"
        )

    if not args.csv_only:
        print("\nUploading to Supabase...")
        upload_estimates(estimates, replace=args.replace)

    print("Done.")


if __name__ == "__main__":
    main()
