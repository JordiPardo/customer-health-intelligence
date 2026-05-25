"""
Verify Supabase project connection and whether app tables are visible.

Usage:
  python scripts/check_supabase.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
from postgrest.exceptions import APIError
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

APP_TABLES = [
    "organizations",
    "customers",
    "usage_events",
    "cohort_anomalies",
]


def main() -> None:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url or not key:
        print("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
        sys.exit(1)

    project_ref = url.replace("https://", "").replace(".supabase.co", "")
    print(f"Project URL: {url}")
    print(f"Project ref: {project_ref}")
    print()

    client = create_client(url, key)
    visible = 0
    for table in APP_TABLES:
        try:
            client.table(table).select("*").limit(0).execute()
            print(f"  {table}: visible via REST API")
            visible += 1
        except APIError as exc:
            print(f"  {table}: NOT visible ({exc})")

    print()
    if visible == len(APP_TABLES):
        print("All app tables are visible. You can run: python scripts/seed_supabase.py")
        return

    print("Tables are not visible via the REST API.")
    print()
    print("Check these in order:")
    print("  1. Supabase dashboard → Table Editor")
    print(f"     Open project {project_ref} and confirm 'customers' exists.")
    print("     - If missing: run 000_reset + 001 migrations in THIS project's SQL Editor.")
    print("     - If present: the API schema cache is stale (step 2).")
    print()
    print("  2. SQL Editor → run supabase/migrations/002_reload_schema_cache.sql")
    print("     Wait ~10 seconds, then re-run this script.")
    print()
    print("  3. Or seed via direct Postgres (bypasses REST cache):")
    print("     Add DATABASE_URL to .env.local from Settings → Database → URI")
    print("     Then run: python scripts/seed_supabase.py --postgres")


if __name__ == "__main__":
    main()
