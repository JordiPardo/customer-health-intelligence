#!/usr/bin/env python3
"""
Seed synthetic A/B experiments for the demo org (Phase 5).

Usage:
  python scripts/run_experiments_pipeline.py
  python scripts/run_experiments_pipeline.py --replace

Requires migration 003_experiments_metadata.sql (treatment, segment columns).
Falls back to name-only rows if columns are missing — run the migration first.
"""

from __future__ import annotations

import argparse
import math
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"

# treatment_group_id / control_group_id: arm identifiers for reporting (1=treatment, 0=control)
EXPERIMENT_SPECS = [
    {
        "name": "Proactive success call — Mid-Market",
        "treatment": "proactive_success_call",
        "segment": "Mid-Market",
        "description": "Randomized outreach vs. standard touchpoints for medium-risk Mid-Market accounts.",
        "status": "completed",
        "sample_per_arm": 40,
        "treatment_churn": 0.125,
        "control_churn": 0.200,
        "started_days_ago": 120,
        "ended_days_ago": 45,
    },
    {
        "name": "Payment recovery — Enterprise",
        "treatment": "payment_recovery_workflow",
        "segment": "Enterprise",
        "description": "Automated dunning sequence vs. manual billing follow-up for Enterprise accounts.",
        "status": "completed",
        "sample_per_arm": 35,
        "treatment_churn": 0.080,
        "control_churn": 0.143,
        "started_days_ago": 100,
        "ended_days_ago": 30,
    },
    {
        "name": "Onboarding relaunch — SMB",
        "treatment": "onboarding_relaunch",
        "segment": "SMB",
        "description": "Guided 14-day relaunch vs. self-serve onboarding for low-adoption SMB accounts.",
        "status": "completed",
        "sample_per_arm": 45,
        "treatment_churn": 0.178,
        "control_churn": 0.244,
        "started_days_ago": 90,
        "ended_days_ago": 20,
    },
    {
        "name": "Expansion discount — Mid-Market",
        "treatment": "expansion_discount",
        "segment": "Mid-Market",
        "description": "Time-boxed discount offer vs. status quo for declining-usage Mid-Market accounts.",
        "status": "running",
        "sample_per_arm": 30,
        "treatment_churn": None,
        "control_churn": None,
        "started_days_ago": 21,
        "ended_days_ago": None,
    },
]


def two_proportion_p_value(n1: int, x1: int, n2: int, x2: int) -> float:
    """Two-sided z-test for difference in proportions."""
    if n1 == 0 or n2 == 0:
        return 1.0
    p1 = x1 / n1
    p2 = x2 / n2
    p_pool = (x1 + x2) / (n1 + n2)
    if p_pool in (0.0, 1.0):
        return 1.0
    se = math.sqrt(p_pool * (1 - p_pool) * (1 / n1 + 1 / n2))
    if se == 0:
        return 1.0
    z = abs(p1 - p2) / se
    # Normal approx two-tailed
    return float(2 * (1 - 0.5 * (1 + math.erf(z / math.sqrt(2)))))


def uplift_pct(treatment_rate: float, control_rate: float) -> float:
    if control_rate == 0:
        return 0.0
    return round((control_rate - treatment_rate) / control_rate * 100, 2)


def load_customers() -> pd.DataFrame:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL not set.")
        sys.exit(1)

    import psycopg2

    with psycopg2.connect(database_url) as conn:
        return pd.read_sql(
            """
            SELECT c.id::text AS customer_id, c.segment
            FROM customers c
            WHERE c.organization_id = %s
            """,
            conn,
            params=(DEMO_ORG_ID,),
        )


def clear_experiments(cur) -> None:
    cur.execute(
        """
        DELETE FROM experiment_results
        WHERE experiment_id IN (
          SELECT id FROM experiments WHERE organization_id = %s
        )
        """,
        (DEMO_ORG_ID,),
    )
    cur.execute(
        """
        DELETE FROM experiment_assignments
        WHERE experiment_id IN (
          SELECT id FROM experiments WHERE organization_id = %s
        )
        """,
        (DEMO_ORG_ID,),
    )
    cur.execute("DELETE FROM experiments WHERE organization_id = %s", (DEMO_ORG_ID,))
    print("  Cleared existing experiments for demo org.")


def has_metadata_columns(cur) -> bool:
    cur.execute(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'experiments'
          AND column_name = 'treatment'
        """
    )
    return cur.fetchone() is not None


def upload_experiments(customers: pd.DataFrame, *, replace: bool = False) -> None:
    import psycopg2
    from psycopg2.extras import execute_values

    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL not set — skipping upload.")
        return

    rng = random.Random(42)
    now = datetime.now(timezone.utc)

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            if replace:
                clear_experiments(cur)

            meta_cols = has_metadata_columns(cur)
            if not meta_cols:
                print(
                    "  Warning: run supabase/migrations/003_experiments_metadata.sql "
                    "for treatment/segment columns."
                )

            for spec in EXPERIMENT_SPECS:
                exp_id = str(uuid.uuid4())
                started = now - timedelta(days=spec["started_days_ago"])
                ended = (
                    now - timedelta(days=spec["ended_days_ago"])
                    if spec["ended_days_ago"] is not None
                    else None
                )

                if meta_cols:
                    cur.execute(
                        """
                        INSERT INTO experiments (
                          id, organization_id, name, treatment, segment, description,
                          treatment_group_id, control_group_id,
                          started_at, ended_at, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            exp_id,
                            DEMO_ORG_ID,
                            spec["name"],
                            spec["treatment"],
                            spec["segment"],
                            spec["description"],
                            1,
                            0,
                            started,
                            ended,
                            spec["status"],
                        ),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO experiments (
                          id, organization_id, name,
                          treatment_group_id, control_group_id,
                          started_at, ended_at, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            exp_id,
                            DEMO_ORG_ID,
                            spec["name"],
                            1,
                            0,
                            started,
                            ended,
                            spec["status"],
                        ),
                    )

                pool = customers[customers["segment"] == spec["segment"]]["customer_id"].tolist()
                if len(pool) < spec["sample_per_arm"] * 2:
                    print(
                        f"  Skip {spec['name']}: not enough customers in {spec['segment']} "
                        f"({len(pool)} available)"
                    )
                    continue

                chosen = rng.sample(pool, spec["sample_per_arm"] * 2)
                treatment_ids = chosen[: spec["sample_per_arm"]]
                control_ids = chosen[spec["sample_per_arm"] :]

                assignment_rows = [
                    (str(uuid.uuid4()), exp_id, cid, "treatment")
                    for cid in treatment_ids
                ] + [
                    (str(uuid.uuid4()), exp_id, cid, "control") for cid in control_ids
                ]

                execute_values(
                    cur,
                    """
                    INSERT INTO experiment_assignments (id, experiment_id, customer_id, "group")
                    VALUES %s
                    """,
                    assignment_rows,
                    page_size=100,
                )

                if spec["status"] == "completed":
                    t_rate = spec["treatment_churn"]
                    c_rate = spec["control_churn"]
                    n_t = len(treatment_ids)
                    n_c = len(control_ids)
                    x_t = int(round(t_rate * n_t))
                    x_c = int(round(c_rate * n_c))
                    p_val = two_proportion_p_value(n_t, x_t, n_c, x_c)

                    cur.execute(
                        """
                        INSERT INTO experiment_results (
                          id, experiment_id,
                          treatment_churn_rate, control_churn_rate,
                          uplift_pct, p_value
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            str(uuid.uuid4()),
                            exp_id,
                            round(t_rate, 3),
                            round(c_rate, 3),
                            uplift_pct(t_rate, c_rate),
                            round(min(p_val, 0.9999), 4),
                        ),
                    )

                print(
                    f"  {spec['name']}: {len(assignment_rows)} assignments, "
                    f"status={spec['status']}"
                )

        conn.commit()

    print("  experiments uploaded.")


def export_csv(customers: pd.DataFrame) -> None:
    out_dir = ROOT / "data" / "synthetic"
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for spec in EXPERIMENT_SPECS:
        row = {**spec}
        if spec["treatment_churn"] is not None:
            row["uplift_pct"] = uplift_pct(spec["treatment_churn"], spec["control_churn"])
        rows.append(row)
    pd.DataFrame(rows).to_csv(out_dir / "experiments.csv", index=False)
    print(f"Saved {out_dir / 'experiments.csv'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed A/B experiments for demo org")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace existing demo org experiments",
    )
    parser.add_argument("--csv-only", action="store_true", help="Skip Supabase upload")
    args = parser.parse_args()

    print("Loading customers...")
    customers = load_customers()
    print(f"  {len(customers)} customers")

    export_csv(customers)

    if not args.csv_only:
        print("\nUploading experiments...")
        upload_experiments(customers, replace=args.replace)

    print("Done.")


if __name__ == "__main__":
    main()
