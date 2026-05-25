"""
Feature engineering for survival analysis (Cox PH).

Builds customer-level features from usage, payment, and support signals,
plus duration/event columns for lifelines.
"""

from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd


def _parse_dates(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    out = df.copy()
    for col in cols:
        out[col] = pd.to_datetime(out[col]).dt.date
    return out


def _usage_pivot(usage: pd.DataFrame) -> pd.DataFrame:
    usage = _parse_dates(usage, ["event_date"])
    pivot = (
        usage.pivot_table(
            index=["customer_id", "event_date"],
            columns="event_type",
            values="event_count",
            aggfunc="sum",
            fill_value=0,
        )
        .reset_index()
    )
    pivot.columns.name = None
    return pivot


def _window_login_stats(
    usage_pivot: pd.DataFrame, snapshot: date, customer_id: str
) -> dict[str, float]:
    rows = usage_pivot[usage_pivot["customer_id"] == customer_id]
    if rows.empty or "login" not in rows.columns:
        return {"logins_last_90d": 0.0, "logins_prior_90d": 0.0, "login_trend": 0.0}

    rows = rows.copy()
    rows["days_before_snapshot"] = rows["event_date"].apply(
        lambda d: (snapshot - d).days
    )

    last_90 = rows[rows["days_before_snapshot"].between(0, 90)]["login"].sum()
    prior_90 = rows[rows["days_before_snapshot"].between(91, 180)]["login"].sum()
    trend = (last_90 - prior_90) / max(prior_90, 1.0)
    return {
        "logins_last_90d": float(last_90),
        "logins_prior_90d": float(prior_90),
        "login_trend": float(trend),
    }


def _payment_stats(
    payments: pd.DataFrame, snapshot: date, customer_id: str
) -> dict[str, float]:
    rows = payments[payments["customer_id"] == customer_id].copy()
    if rows.empty:
        return {"payment_failure_rate": 0.0, "past_due_count": 0.0}

    rows["event_date"] = pd.to_datetime(rows["event_date"]).dt.date
    rows = rows[rows["event_date"] <= snapshot]
    total = len(rows)
    failures = (rows["event_type"] == "payment_failed").sum()
    past_due = (rows["event_type"] == "invoice_past_due").sum()
    return {
        "payment_failure_rate": float(failures / max(total, 1)),
        "past_due_count": float(past_due),
    }


def _support_stats(
    support: pd.DataFrame, snapshot: date, customer_id: str
) -> dict[str, float]:
    rows = support[support["customer_id"] == customer_id].copy()
    if rows.empty:
        return {"negative_sentiment_rate": 0.0, "ticket_count": 0.0}

    rows["ticket_date"] = pd.to_datetime(rows["ticket_date"]).dt.date
    rows = rows[rows["ticket_date"] <= snapshot]
    count = len(rows)
    negative = (rows["sentiment"] == "negative").sum()
    return {
        "negative_sentiment_rate": float(negative / max(count, 1)),
        "ticket_count": float(count),
    }


def build_customer_features(data: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Return one row per customer with engineered features, duration, and event.
    """
    customers = _parse_dates(data["customers"], ["signup_date", "cohort_month"])
    customers = customers.rename(columns={"id": "customer_id"})
    labels = _parse_dates(data["churn_labels"], ["snapshot_date"])
    usage = data["usage_events"]
    payments = _parse_dates(data["payment_events"], ["event_date"])
    support = data["support_sentiment"]

    # One snapshot per customer (latest if multiple)
    labels = (
        labels.sort_values("snapshot_date")
        .groupby("customer_id", as_index=False)
        .tail(1)
    )

    merged = customers.merge(labels, on="customer_id", how="inner", suffixes=("", "_label"))
    usage_pivot = _usage_pivot(usage)

    feature_rows: list[dict] = []
    for _, row in merged.iterrows():
        snapshot = row["snapshot_date"]
        cid = row["customer_id"]
        signup = row["signup_date"]
        tenure_days = (snapshot - signup).days
        tenure_days = max(tenure_days, 1)

        if row["churned"] and pd.notna(row["days_to_churn"]):
            duration = int(row["days_to_churn"])
            event = 1
        else:
            duration = tenure_days
            event = 0

        duration = max(duration, 1)

        feats = {
            "customer_id": cid,
            "snapshot_date": snapshot,
            "duration": duration,
            "event": event,
            "tenure_days": tenure_days,
            "mrr": float(row["mrr"]),
            "log_mrr": float(np.log1p(row["mrr"])),
            "downgraded": int(bool(row["downgraded"])),
            "plan_tier": row["plan_tier"],
            "segment": row["segment"],
            "industry": row["industry"],
        }
        feats.update(_window_login_stats(usage_pivot, snapshot, cid))
        feats.update(_payment_stats(payments, snapshot, cid))
        feats.update(_support_stats(support, snapshot, cid))
        feature_rows.append(feats)

    return pd.DataFrame(feature_rows)


def prepare_cox_matrix(features: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """
    One-hot encode categoricals and return matrix ready for CoxPHFitter.
    """
    df = features.copy()
    categoricals = ["plan_tier", "segment", "industry"]
    df = pd.get_dummies(df, columns=categoricals, drop_first=True, dtype=float)

    exclude = {"customer_id", "snapshot_date"}
    feature_cols = [c for c in df.columns if c not in exclude]

    numeric_cols = [
        c
        for c in feature_cols
        if c not in {"duration", "event"} and pd.api.types.is_numeric_dtype(df[c])
    ]

    cox_df = df[["duration", "event"] + numeric_cols].copy()
    cox_df = cox_df.replace([np.inf, -np.inf], np.nan).fillna(0.0)
    return cox_df, numeric_cols
