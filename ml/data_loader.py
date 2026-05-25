"""
Load training data from Supabase (Postgres) or local CSV fallbacks.
"""

from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "synthetic"

load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")


def _read_table_postgres(table: str) -> pd.DataFrame:
    import psycopg2

    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is required to load data from Supabase.")

    with psycopg2.connect(database_url) as conn:
        return pd.read_sql_query(f"SELECT * FROM {table}", conn)


def _read_table_csv(table: str) -> pd.DataFrame:
    path = DATA_DIR / f"{table}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Run scripts/generate_synthetic_data.py")
    return pd.read_csv(path)


def load_table(table: str, *, prefer_postgres: bool = True) -> pd.DataFrame:
    if prefer_postgres and os.environ.get("DATABASE_URL"):
        try:
            return _read_table_postgres(table)
        except Exception as exc:
            print(f"Postgres load failed for {table} ({exc}); falling back to CSV.")

    return _read_table_csv(table)


def load_training_data(*, prefer_postgres: bool = True) -> dict[str, pd.DataFrame]:
    tables = [
        "customers",
        "usage_events",
        "payment_events",
        "support_sentiment",
        "churn_labels",
    ]
    return {name: load_table(name, prefer_postgres=prefer_postgres) for name in tables}
