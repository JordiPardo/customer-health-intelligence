#!/usr/bin/env python3
"""
Seed synthetic A/B experiments for the demo org (Phase 5).

Usage:
  python scripts/run_experiments_pipeline.py --replace
  python scripts/run_experiments_pipeline.py --replace --postgres

Default upload uses Supabase REST + SUPABASE_SERVICE_ROLE_KEY (same as the app).
Use --postgres only if you prefer DATABASE_URL (Session pooler URI).

Requires migration 003_experiments_metadata.sql (treatment, segment columns).
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
from urllib.parse import urlparse

import pandas as pd
from dotenv import load_dotenv
from postgrest.exceptions import APIError

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"
BATCH_SIZE = 200

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
    return float(2 * (1 - 0.5 * (1 + math.erf(z / math.sqrt(2)))))


def uplift_pct(treatment_rate: float, control_rate: float) -> float:
    if control_rate == 0:
        return 0.0
    return round((control_rate - treatment_rate) / control_rate * 100, 2)


def get_supabase_client():
    from supabase import create_client

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)
    return create_client(url, key)


def get_database_url() -> str:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("Missing DATABASE_URL in .env.local for --postgres mode.")
        print("Get it from Supabase → Connect → Session pooler → URI")
        sys.exit(1)

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    api_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")
    parsed = urlparse(database_url)
    db_user = parsed.username or ""
    db_ref = db_user.removeprefix("postgres.") if db_user.startswith("postgres.") else ""

    if api_ref and db_ref and db_ref != api_ref:
        print("DATABASE_URL project ref does not match NEXT_PUBLIC_SUPABASE_URL.")
        print(f"  API project:       {api_ref}")
        print(f"  DATABASE_URL user: postgres.{db_ref}")
        print("Copy a fresh Session pooler URI from the same project as your API keys.")
        sys.exit(1)

    if "pooler.supabase.com" in (parsed.hostname or "") and db_user == "postgres":
        print("Session pooler requires username postgres.<project-ref>, not just postgres.")
        print(f"Expected: postgres.{api_ref}")
        print("Reset the database password in Supabase → Settings → Database if needed.")
        sys.exit(1)

    return database_url


def load_customers_rest(client) -> pd.DataFrame:
    resp = (
        client.table("customers")
        .select("id, segment")
        .eq("organization_id", DEMO_ORG_ID)
        .execute()
    )
    rows = resp.data or []
    return pd.DataFrame(
        [{"customer_id": str(r["id"]), "segment": r["segment"]} for r in rows]
    )


def load_customers_postgres() -> pd.DataFrame:
    import psycopg2

    database_url = get_database_url()
    try:
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
    except Exception as exc:
        print(f"Postgres connection failed: {exc}")
        print()
        print("Fix DATABASE_URL (Session pooler URI + current DB password), or run without --postgres:")
        print("  python scripts/run_experiments_pipeline.py --replace")
        sys.exit(1)


def clear_experiments_rest(client) -> None:
    resp = (
        client.table("experiments")
        .select("id")
        .eq("organization_id", DEMO_ORG_ID)
        .execute()
    )
    ids = [row["id"] for row in (resp.data or [])]
    if ids:
        client.table("experiment_results").delete().in_("experiment_id", ids).execute()
        client.table("experiment_assignments").delete().in_("experiment_id", ids).execute()
    client.table("experiments").delete().eq("organization_id", DEMO_ORG_ID).execute()
    print("  Cleared existing experiments for demo org.")


def clear_experiments_postgres(cur) -> None:
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


def insert_batches_rest(client, table: str, rows: list[dict]) -> None:
    for i in range(0, len(rows), BATCH_SIZE):
        client.table(table).insert(rows[i : i + BATCH_SIZE]).execute()


def seed_experiments(
    customers: pd.DataFrame,
    *,
    replace: bool,
    use_postgres: bool,
) -> None:
    rng = random.Random(42)
    now = datetime.now(timezone.utc)

    if use_postgres:
        _seed_postgres(customers, rng, now, replace=replace)
    else:
        _seed_rest(customers, rng, now, replace=replace)


def _build_rows_for_spec(
    spec: dict,
    customers: pd.DataFrame,
    rng: random.Random,
    now: datetime,
) -> tuple[dict, list[dict], dict | None] | None:
    exp_id = str(uuid.uuid4())
    started = now - timedelta(days=spec["started_days_ago"])
    ended = (
        now - timedelta(days=spec["ended_days_ago"])
        if spec["ended_days_ago"] is not None
        else None
    )

    experiment_row = {
        "id": exp_id,
        "organization_id": DEMO_ORG_ID,
        "name": spec["name"],
        "treatment": spec["treatment"],
        "segment": spec["segment"],
        "description": spec["description"],
        "treatment_group_id": 1,
        "control_group_id": 0,
        "started_at": started.isoformat(),
        "ended_at": ended.isoformat() if ended else None,
        "status": spec["status"],
    }

    pool = customers[customers["segment"] == spec["segment"]]["customer_id"].tolist()
    if len(pool) < spec["sample_per_arm"] * 2:
        print(
            f"  Skip {spec['name']}: not enough customers in {spec['segment']} "
            f"({len(pool)} available)"
        )
        return None

    chosen = rng.sample(pool, spec["sample_per_arm"] * 2)
    treatment_ids = chosen[: spec["sample_per_arm"]]
    control_ids = chosen[spec["sample_per_arm"] :]

    assignment_rows = [
        {
            "id": str(uuid.uuid4()),
            "experiment_id": exp_id,
            "customer_id": cid,
            "group": "treatment",
        }
        for cid in treatment_ids
    ] + [
        {
            "id": str(uuid.uuid4()),
            "experiment_id": exp_id,
            "customer_id": cid,
            "group": "control",
        }
        for cid in control_ids
    ]

    result_row = None
    if spec["status"] == "completed":
        t_rate = spec["treatment_churn"]
        c_rate = spec["control_churn"]
        n_t = len(treatment_ids)
        n_c = len(control_ids)
        x_t = int(round(t_rate * n_t))
        x_c = int(round(c_rate * n_c))
        p_val = two_proportion_p_value(n_t, x_t, n_c, x_c)
        result_row = {
            "id": str(uuid.uuid4()),
            "experiment_id": exp_id,
            "treatment_churn_rate": round(t_rate, 3),
            "control_churn_rate": round(c_rate, 3),
            "uplift_pct": uplift_pct(t_rate, c_rate),
            "p_value": round(min(p_val, 0.9999), 4),
        }

    return experiment_row, assignment_rows, result_row


def _seed_rest(
    customers: pd.DataFrame,
    rng: random.Random,
    now: datetime,
    *,
    replace: bool,
) -> None:
    client = get_supabase_client()

    try:
        client.table("experiments").select("treatment").limit(0).execute()
    except APIError as exc:
        if "treatment" in str(exc) or "column" in str(exc).lower():
            print("Missing treatment/segment columns on experiments.")
            print("Run supabase/migrations/003_experiments_metadata.sql in SQL Editor.")
            sys.exit(1)
        raise

    if replace:
        clear_experiments_rest(client)

    for spec in EXPERIMENT_SPECS:
        built = _build_rows_for_spec(spec, customers, rng, now)
        if not built:
            continue
        experiment_row, assignment_rows, result_row = built

        client.table("experiments").insert(experiment_row).execute()
        insert_batches_rest(client, "experiment_assignments", assignment_rows)
        if result_row:
            client.table("experiment_results").insert(result_row).execute()

        print(
            f"  {spec['name']}: {len(assignment_rows)} assignments, "
            f"status={spec['status']}"
        )

    print("  experiments uploaded (REST).")


def _seed_postgres(
    customers: pd.DataFrame,
    rng: random.Random,
    now: datetime,
    *,
    replace: bool,
) -> None:
    import psycopg2
    from psycopg2.extras import execute_values

    database_url = get_database_url()

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            if replace:
                clear_experiments_postgres(cur)

            for spec in EXPERIMENT_SPECS:
                built = _build_rows_for_spec(spec, customers, rng, now)
                if not built:
                    continue
                experiment_row, assignment_rows, result_row = built

                cur.execute(
                    """
                    INSERT INTO experiments (
                      id, organization_id, name, treatment, segment, description,
                      treatment_group_id, control_group_id,
                      started_at, ended_at, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        experiment_row["id"],
                        experiment_row["organization_id"],
                        experiment_row["name"],
                        experiment_row["treatment"],
                        experiment_row["segment"],
                        experiment_row["description"],
                        experiment_row["treatment_group_id"],
                        experiment_row["control_group_id"],
                        experiment_row["started_at"],
                        experiment_row["ended_at"],
                        experiment_row["status"],
                    ),
                )

                execute_values(
                    cur,
                    """
                    INSERT INTO experiment_assignments (id, experiment_id, customer_id, "group")
                    VALUES %s
                    """,
                    [
                        (r["id"], r["experiment_id"], r["customer_id"], r["group"])
                        for r in assignment_rows
                    ],
                    page_size=100,
                )

                if result_row:
                    cur.execute(
                        """
                        INSERT INTO experiment_results (
                          id, experiment_id,
                          treatment_churn_rate, control_churn_rate,
                          uplift_pct, p_value
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            result_row["id"],
                            result_row["experiment_id"],
                            result_row["treatment_churn_rate"],
                            result_row["control_churn_rate"],
                            result_row["uplift_pct"],
                            result_row["p_value"],
                        ),
                    )

                print(
                    f"  {spec['name']}: {len(assignment_rows)} assignments, "
                    f"status={spec['status']}"
                )

        conn.commit()

    print("  experiments uploaded (Postgres).")


def export_csv() -> None:
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
    parser.add_argument(
        "--postgres",
        action="store_true",
        help="Use DATABASE_URL instead of Supabase REST API",
    )
    args = parser.parse_args()

    print("Loading customers...")
    if args.postgres:
        customers = load_customers_postgres()
    else:
        client = get_supabase_client()
        customers = load_customers_rest(client)
    print(f"  {len(customers)} customers")

    export_csv()

    if not args.csv_only:
        mode = "Postgres" if args.postgres else "REST"
        print(f"\nUploading experiments ({mode})...")
        seed_experiments(customers, replace=args.replace, use_postgres=args.postgres)

    print("Done.")


if __name__ == "__main__":
    main()
