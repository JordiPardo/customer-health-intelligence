"""
Generate realistic synthetic B2B SaaS customer data for Customer Health Intelligence.

Outputs CSV files to data/synthetic/ for inspection and seeding via seed_supabase.py.
"""

from __future__ import annotations

import json
import uuid
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42
NUM_CUSTOMERS = 500
MONTHS_HISTORY = 12
CHURN_RATE = 0.15
DOWNGRADE_RATE = 0.05
DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"
ANOMALY_COHORT = date(2024, 8, 1)  # planted high-churn cohort

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "synthetic"

COMPANY_PREFIXES = [
    "Brightpath",
    "Northwind",
    "Clearview",
    "Summit",
    "Harbor",
    "Vertex",
    "Lumen",
    "Atlas",
    "Forge",
    "Pioneer",
    "Cascade",
    "Meridian",
    "Nexus",
    "Horizon",
    "Apex",
]

COMPANY_SUFFIXES = [
    "Labs",
    "Systems",
    "Analytics",
    "Software",
    "Dynamics",
    "Cloud",
    "Digital",
    "Works",
    "Group",
    "Solutions",
    "Tech",
    "Industries",
]

INDUSTRIES = [
    "Technology",
    "Healthcare",
    "Finance",
    "Retail",
    "Manufacturing",
    "Education",
    "Logistics",
    "Professional services",
]

PLAN_TIERS = {
    "Starter": (49, 149),
    "Pro": (199, 499),
    "Enterprise": (999, 4999),
}

SEGMENTS = ["SMB", "Mid-Market", "Enterprise"]
SUPPORT_CATEGORIES = [
    "Billing",
    "Onboarding",
    "Bug report",
    "Feature request",
    "Integration",
    "Account access",
]


def _month_start(d: date) -> date:
    return d.replace(day=1)


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def generate_company_names(rng: np.random.Generator, n: int) -> list[str]:
    """Generate n unique B2B-style company names."""
    names: list[str] = []
    seen: set[str] = set()
    while len(names) < n:
        base = f"{rng.choice(COMPANY_PREFIXES)} {rng.choice(COMPANY_SUFFIXES)}"
        name = base if base not in seen else f"{base} {len(names) + 1}"
        if name not in seen:
            seen.add(name)
            names.append(name)
    return names


def assign_customer_fates(
    rng: np.random.Generator, n: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return churned flags, downgraded flags, days_to_churn (nullable)."""
    churned = np.zeros(n, dtype=bool)
    downgraded = np.zeros(n, dtype=bool)
    days_to_churn = np.full(n, np.nan)

    churn_indices = rng.choice(n, size=int(n * CHURN_RATE), replace=False)
    churned[churn_indices] = True

    remaining = np.where(~churned)[0]
    downgrade_count = int(n * DOWNGRADE_RATE)
    downgrade_indices = rng.choice(remaining, size=downgrade_count, replace=False)
    downgraded[downgrade_indices] = True

    for idx in churn_indices:
        days_to_churn[idx] = rng.integers(15, 330)

    return churned, downgraded, days_to_churn


def build_customers(rng: np.random.Generator, end_date: date) -> pd.DataFrame:
    names = generate_company_names(rng, NUM_CUSTOMERS)
    churned, downgraded, days_to_churn = assign_customer_fates(rng, NUM_CUSTOMERS)

    rows: list[dict] = []
    cohort_starts = [
        _add_months(_month_start(end_date), -i) for i in range(MONTHS_HISTORY, 0, -1)
    ]

    for i, name in enumerate(names):
        cohort_month = rng.choice(cohort_starts)
        # Plant anomaly cohort with extra churn pressure (handled in events)
        if cohort_month == ANOMALY_COHORT and not churned[i] and rng.random() < 0.35:
            churned[i] = True
            days_to_churn[i] = rng.integers(20, 90)

        signup_day = min(
            int(rng.integers(1, 28)),
            28,
        )
        signup_date = cohort_month.replace(day=signup_day)
        if signup_date > end_date:
            signup_date = cohort_month.replace(day=1)

        plan = rng.choice(["Starter", "Pro", "Enterprise"], p=[0.45, 0.35, 0.20])
        low, high = PLAN_TIERS[plan]
        mrr = round(float(rng.uniform(low, high)), 2)

        if downgraded[i]:
            plan = "Starter"
            mrr = round(float(rng.uniform(49, 99)), 2)

        segment = (
            "Enterprise"
            if plan == "Enterprise"
            else ("Mid-Market" if plan == "Pro" else "SMB")
        )

        rows.append(
            {
                "id": str(uuid.uuid4()),
                "organization_id": DEMO_ORG_ID,
                "stripe_customer_id": f"cus_{uuid.uuid4().hex[:14]}",
                "name": name,
                "cohort_month": cohort_month.isoformat(),
                "mrr": mrr,
                "signup_date": signup_date.isoformat(),
                "plan_tier": plan,
                "industry": rng.choice(INDUSTRIES),
                "segment": segment,
                "churned": bool(churned[i]),
                "downgraded": bool(downgraded[i]),
                "days_to_churn": int(days_to_churn[i]) if churned[i] else None,
            }
        )

    return pd.DataFrame(rows)


def generate_monthly_dates(start: date, end: date) -> list[date]:
    dates: list[date] = []
    current = _month_start(start)
    while current <= _month_start(end):
        dates.append(current)
        current = _add_months(current, 1)
    return dates


def build_usage_events(customers: pd.DataFrame, end_date: date) -> pd.DataFrame:
    rng = np.random.default_rng(SEED + 1)
    rows: list[dict] = []

    for _, customer in customers.iterrows():
        signup = date.fromisoformat(customer["signup_date"])
        months = generate_monthly_dates(signup, end_date)
        base_logins = rng.integers(20, 200)
        trend = rng.uniform(-0.08, 0.05)

        if customer["churned"]:
            trend = rng.uniform(-0.25, -0.08)
        elif customer["downgraded"]:
            trend = rng.uniform(-0.15, -0.03)

        for i, month in enumerate(months):
            login_count = max(0, int(base_logins * (1 + trend * i) + rng.normal(0, 8)))
            feature_count = max(0, int(login_count * rng.uniform(0.3, 0.8)))
            api_count = max(0, int(login_count * rng.uniform(0.5, 2.0)))

            for event_type, count in [
                ("login", login_count),
                ("feature_used", feature_count),
                ("api_call", api_count),
            ]:
                rows.append(
                    {
                        "id": str(uuid.uuid4()),
                        "customer_id": customer["id"],
                        "event_date": month.isoformat(),
                        "event_type": event_type,
                        "event_count": count,
                    }
                )

    return pd.DataFrame(rows)


def build_payment_events(customers: pd.DataFrame, end_date: date) -> pd.DataFrame:
    rng = np.random.default_rng(SEED + 2)
    rows: list[dict] = []

    for _, customer in customers.iterrows():
        signup = date.fromisoformat(customer["signup_date"])
        months = generate_monthly_dates(signup, end_date)
        mrr = float(customer["mrr"])
        failure_rate = 0.02

        if customer["churned"]:
            failure_rate = rng.uniform(0.12, 0.35)
        elif customer["downgraded"]:
            failure_rate = rng.uniform(0.06, 0.15)

        # Anomaly cohort: payment failure spike
        if date.fromisoformat(customer["cohort_month"]) == ANOMALY_COHORT:
            failure_rate = max(failure_rate, rng.uniform(0.18, 0.30))

        for month in months:
            if rng.random() > failure_rate:
                rows.append(
                    {
                        "id": str(uuid.uuid4()),
                        "customer_id": customer["id"],
                        "event_date": month.isoformat(),
                        "event_type": "payment_success",
                        "amount": mrr,
                    }
                )
            else:
                rows.append(
                    {
                        "id": str(uuid.uuid4()),
                        "customer_id": customer["id"],
                        "event_date": month.isoformat(),
                        "event_type": "payment_failed",
                        "amount": mrr,
                    }
                )
                if rng.random() < 0.4:
                    past_due = _add_months(month, 0).replace(day=min(month.day, 28))
                    rows.append(
                        {
                            "id": str(uuid.uuid4()),
                            "customer_id": customer["id"],
                            "event_date": past_due.isoformat(),
                            "event_type": "invoice_past_due",
                            "amount": mrr,
                        }
                    )

    return pd.DataFrame(rows)


def build_support_sentiment(customers: pd.DataFrame, end_date: date) -> pd.DataFrame:
    rng = np.random.default_rng(SEED + 3)
    rows: list[dict] = []

    for _, customer in customers.iterrows():
        ticket_count = rng.integers(0, 6)
        negative_bias = 0.15
        if customer["churned"]:
            negative_bias = 0.55
        elif customer["downgraded"]:
            negative_bias = 0.35

        signup = date.fromisoformat(customer["signup_date"])
        for _ in range(ticket_count):
            day_offset = rng.integers(0, max(1, (end_date - signup).days))
            ticket_date = signup + timedelta(days=int(day_offset))
            roll = rng.random()
            if roll < negative_bias:
                sentiment = "negative"
            elif roll < negative_bias + 0.25:
                sentiment = "neutral"
            else:
                sentiment = "positive"

            rows.append(
                {
                    "id": str(uuid.uuid4()),
                    "customer_id": customer["id"],
                    "ticket_date": ticket_date.isoformat(),
                    "sentiment": sentiment,
                    "category": rng.choice(SUPPORT_CATEGORIES),
                }
            )

    return pd.DataFrame(rows)


def build_churn_labels(customers: pd.DataFrame, snapshot_date: date) -> pd.DataFrame:
    rows: list[dict] = []
    for _, customer in customers.iterrows():
        rows.append(
            {
                "id": str(uuid.uuid4()),
                "customer_id": customer["id"],
                "snapshot_date": snapshot_date.isoformat(),
                "churned": customer["churned"],
                "days_to_churn": customer["days_to_churn"],
                "downgraded": customer["downgraded"],
            }
        )
    return pd.DataFrame(rows)


def build_cohort_anomalies(customers: pd.DataFrame) -> pd.DataFrame:
    """Plant cohort-level anomalies for the demo dashboard."""
    cohorts = customers.groupby("cohort_month").agg(
        customer_count=("id", "count"),
        churn_rate=("churned", "mean"),
    )

    overall_churn = customers["churned"].mean()
    rows: list[dict] = []

    for cohort_month, row in cohorts.iterrows():
        expected = round(overall_churn * 100, 2)
        observed = round(float(row["churn_rate"]) * 100, 2)
        deviation = round((observed - expected) / max(expected, 0.01) * 100, 2)

        if cohort_month == ANOMALY_COHORT.isoformat():
            severity = "high"
            explanation = (
                "August 2024 cohort shows elevated churn driven by payment failures "
                "and declining product usage in the first 60 days."
            )
        elif deviation > 40:
            severity = "medium"
            explanation = (
                f"Cohort {cohort_month} deviates from baseline churn; "
                "review onboarding and payment health."
            )
        elif deviation > 20:
            severity = "low"
            explanation = f"Cohort {cohort_month} is slightly above historical churn norms."
        else:
            continue

        rows.append(
            {
                "id": str(uuid.uuid4()),
                "organization_id": DEMO_ORG_ID,
                "cohort_month": cohort_month,
                "metric": "churn_rate_pct",
                "expected_value": expected,
                "observed_value": observed,
                "deviation_pct": deviation,
                "severity": severity,
                "explanation": explanation,
            }
        )

    return pd.DataFrame(rows)


def main() -> None:
    rng = np.random.default_rng(SEED)
    end_date = date(2025, 4, 30)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    customers = build_customers(rng, end_date)
    customer_export = customers.drop(columns=["churned", "downgraded", "days_to_churn"])

    usage = build_usage_events(customers, end_date)
    payments = build_payment_events(customers, end_date)
    support = build_support_sentiment(customers, end_date)
    churn_labels = build_churn_labels(customers, end_date)
    anomalies = build_cohort_anomalies(customers)

    customer_export.to_csv(OUTPUT_DIR / "customers.csv", index=False)
    usage.to_csv(OUTPUT_DIR / "usage_events.csv", index=False)
    payments.to_csv(OUTPUT_DIR / "payment_events.csv", index=False)
    support.to_csv(OUTPUT_DIR / "support_sentiment.csv", index=False)
    churn_labels.to_csv(OUTPUT_DIR / "churn_labels.csv", index=False)
    anomalies.to_csv(OUTPUT_DIR / "cohort_anomalies.csv", index=False)

    meta = {
        "seed": SEED,
        "num_customers": len(customers),
        "churn_rate": round(customers["churned"].mean(), 3),
        "downgrade_rate": round(customers["downgraded"].mean(), 3),
        "organization_id": DEMO_ORG_ID,
        "anomaly_cohort": ANOMALY_COHORT.isoformat(),
    }
    (OUTPUT_DIR / "metadata.json").write_text(json.dumps(meta, indent=2))

    print(f"Generated {len(customers)} customers → {OUTPUT_DIR}")
    print(f"  Churn rate: {meta['churn_rate']:.1%}")
    print(f"  Downgrade rate: {meta['downgrade_rate']:.1%}")
    print(f"  Anomalies: {len(anomalies)} cohort flags")


if __name__ == "__main__":
    main()
