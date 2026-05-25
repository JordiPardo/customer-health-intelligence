"""
Load synthetic CSV data into Supabase using the service role key.

Prerequisites:
  1. Run supabase/migrations/001_initial_schema.sql in your Supabase project
  2. Copy .env.example → .env.local (root) and scripts/.env (or use root .env)
  3. python scripts/generate_synthetic_data.py
  4. python scripts/seed_supabase.py

If REST API can't see tables after migration, either:
  - Run supabase/migrations/002_reload_schema_cache.sql in SQL Editor, or
  - Add DATABASE_URL to .env.local and run: python scripts/seed_supabase.py --postgres
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from postgrest.exceptions import APIError
from supabase import create_client

from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "synthetic"
MIGRATION_FILE = ROOT / "supabase" / "migrations" / "001_initial_schema.sql"
RELOAD_FILE = ROOT / "supabase" / "migrations" / "002_reload_schema_cache.sql"
BATCH_SIZE = 500

SEED_TABLES = [
    "customers",
    "usage_events",
    "payment_events",
    "support_sentiment",
    "churn_labels",
    "cohort_anomalies",
]

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")


def get_client():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)
    return create_client(url, key)


def read_csv(name: str) -> list[dict]:
    path = DATA_DIR / name
    if not path.exists():
        print(f"Missing {path}. Run: python scripts/generate_synthetic_data.py")
        sys.exit(1)
    df = pd.read_csv(path)
    records = df.to_dict(orient="records")
    for row in records:
        for key, value in row.items():
            if value is None or (isinstance(value, float) and pd.isna(value)):
                row[key] = None
    return records


def print_schema_help() -> None:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    project_ref = url.replace("https://", "").replace(".supabase.co", "")
    reset_file = ROOT / "supabase" / "migrations" / "000_reset_dev_schema.sql"

    print("Database schema not visible via REST API.")
    print()
    print(f"Connected to project: {project_ref}")
    print()
    print("In Supabase dashboard for THIS project:")
    print("  1. Table Editor → confirm 'customers' table exists")
    print("     - Missing? Run SQL Editor:")
    print(f"       a) {reset_file.relative_to(ROOT)}")
    print(f"       b) {MIGRATION_FILE.relative_to(ROOT)}")
    print(f"     - Present? Run SQL Editor: {RELOAD_FILE.relative_to(ROOT)}")
    print("       Wait 10s, then re-run this script.")
    print()
    print("  2. Or bypass REST entirely — add DATABASE_URL to .env.local")
    print("     (Settings → Database → Connection string → URI)")
    print("     Then run: python scripts/seed_supabase.py --postgres")
    print()
    print("  3. Diagnose: python scripts/check_supabase.py")


def rest_schema_ready(client) -> bool:
    try:
        client.table("customers").select("id").limit(1).execute()
        return True
    except APIError as exc:
        message = str(exc)
        if "PGRST205" in message or "Could not find the table" in message:
            return False
        raise


def insert_batches_rest(client, table: str, rows: list[dict]) -> None:
    if not rows:
        return
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        client.table(table).insert(batch).execute()
    print(f"  {table}: {len(rows)} rows")


def get_database_url() -> str:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        print("Missing DATABASE_URL in .env.local for --postgres mode.")
        print("Get it from Supabase → Connect → Direct connection → Session pooler → URI")
        print("It must start with postgresql:// (not https://.../rest/v1/)")
        sys.exit(1)
    if database_url.startswith("https://") or "/rest/v1" in database_url:
        print("DATABASE_URL looks like a REST API URL, not Postgres.")
        print("Use the URI from Connect → Direct connection → Session pooler (copy as-is, including port)")
        print("Example: postgresql://postgres.hquvcxiqyfaohsmpmiuf:[password]@aws-1-eu-north-1.pooler.supabase.com:5432/postgres")
        sys.exit(1)

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    api_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")
    parsed = urlparse(database_url)
    db_user = parsed.username or ""
    db_ref = db_user.removeprefix("postgres.") if db_user.startswith("postgres.") else ""

    if api_ref and db_ref and db_ref != api_ref:
        print("DATABASE_URL project ref does not match NEXT_PUBLIC_SUPABASE_URL.")
        print(f"  API project:      {api_ref}")
        print(f"  DATABASE_URL user: postgres.{db_ref}")
        print()
        print("Copy a fresh Session pooler URI from the SAME project as your API keys.")
        print(f"Username should be: postgres.{api_ref}")
        sys.exit(1)

    if "pooler.supabase.com" in (parsed.hostname or "") and db_user == "postgres":
        print("Session pooler requires username postgres.<project-ref>, not just postgres.")
        print(f"Expected: postgres.{api_ref}")
        sys.exit(1)

    return database_url


def insert_batches_postgres(table: str, rows: list[dict]) -> None:
    try:
        import psycopg2
        from psycopg2.extras import execute_values
    except ImportError:
        print("Install psycopg2: pip install psycopg2-binary")
        sys.exit(1)

    database_url = get_database_url()

    if not rows:
        return

    columns = list(rows[0].keys())
    col_list = ", ".join(columns)
    values = [[row[col] for col in columns] for row in rows]

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            for i in range(0, len(values), BATCH_SIZE):
                batch = values[i : i + BATCH_SIZE]
                execute_values(
                    cur,
                    f"INSERT INTO {table} ({col_list}) VALUES %s",
                    batch,
                )
        conn.commit()

    print(f"  {table}: {len(rows)} rows")


def verify_postgres_schema() -> None:
    try:
        import psycopg2
    except ImportError:
        print("Install psycopg2: pip install psycopg2-binary")
        sys.exit(1)

    database_url = get_database_url()

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'customers'
                """
            )
            if cur.fetchone() is None:
                print("Postgres connected, but 'customers' table does not exist.")
                print_schema_help()
                sys.exit(1)


def postgres_table_count(table: str) -> int:
    import psycopg2

    database_url = get_database_url()
    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            return int(cur.fetchone()[0])


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Supabase with synthetic CSV data")
    parser.add_argument(
        "--postgres",
        action="store_true",
        help="Insert via DATABASE_URL (bypasses REST API schema cache)",
    )
    parser.add_argument(
        "--only",
        metavar="TABLES",
        help="Comma-separated tables to seed (e.g. churn_labels,cohort_anomalies)",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip tables that already have rows (Postgres mode only)",
    )
    args = parser.parse_args()

    tables = SEED_TABLES
    if args.only:
        tables = [t.strip() for t in args.only.split(",") if t.strip()]
        unknown = set(tables) - set(SEED_TABLES)
        if unknown:
            print(f"Unknown tables: {', '.join(sorted(unknown))}")
            sys.exit(1)

    if args.postgres:
        print("Checking Postgres schema...")
        verify_postgres_schema()
        print("Seeding via Postgres...")
        for table in tables:
            if args.skip_existing and postgres_table_count(table) > 0:
                print(f"  {table}: skipped ({postgres_table_count(table)} rows already)")
                continue
            insert_batches_postgres(table, read_csv(f"{table}.csv"))
        print("Done.")
        return

    client = get_client()

    print("Checking database schema via REST API...")
    if not rest_schema_ready(client):
        print_schema_help()
        sys.exit(1)

    print("Seeding Supabase from CSV...")
    for table in tables:
        insert_batches_rest(client, read_csv(f"{table}.csv"))
    print("Done.")


if __name__ == "__main__":
    main()
