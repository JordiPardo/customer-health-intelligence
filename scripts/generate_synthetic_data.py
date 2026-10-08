"""
Generate realistic synthetic B2B SaaS customer data for Customer Health Intelligence.

The data follows an explicit, time-consistent generative process so that the
survival and causal models can be checked against a known ground truth:

1. Each customer gets latent traits (usage trend, billing friction, support
   negativity, engagement level) plus observed attributes (plan, MRR, ...).
2. Churn time is drawn from a Weibull proportional-hazards model whose
   coefficients are known (TRUE_COEFS). Customers whose churn date falls after
   the snapshot are right-censored, exactly as in a real data export.
3. Usage, billing and support events only exist while the customer is active
   (signup → churn or snapshot), never after churning.
4. At day LANDMARK_DAYS customer success decides on retention playbooks using
   only what it can see at that moment (early usage, billing and tickets).
   Riskier-looking accounts are treated more often (confounding by indication)
   and each playbook has a known true effect (TRUE_PLAYBOOK_LOG_HR), so causal
   estimates can be compared with the truth.

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
NUM_CUSTOMERS = 3000
MONTHS_HISTORY = 24
SNAPSHOT_DATE = date(2025, 4, 30)
DOWNGRADE_RATE = 0.05
DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"
ANOMALY_COHORT = date(2024, 8, 1)  # planted high-churn cohort

# Weibull baseline hazard: H0(t) = WEIBULL_SCALE * t^k, t in days since signup.
# k < 1 → churn risk is highest early in the customer lifetime.
WEIBULL_SHAPE = 0.9
WEIBULL_SCALE = 0.035

# True log hazard ratios, on the same units as the model features
# (see ml/feature_engineering.py). Positive = higher churn risk.
TRUE_COEFS = {
    "login_trend": -12.0,  # monthly log-change in logins (-0.05 = -5%/month)
    "log_early_logins": -0.5,  # log1p(mean monthly logins, first 3 months)
    "payment_failure_rate": 4.0,  # share of invoices that failed
    "negative_sentiment_rate": 2.0,  # share of support tickets with negative sentiment
    "downgraded": 0.8,
    "log_mrr": -0.2,
}
ANOMALY_COHORT_LOG_HR = 0.6  # unobserved extra risk for the anomaly cohort

# Playbooks are decided at day LANDMARK_DAYS; effects apply from then on.
LANDMARK_DAYS = 90
CAUSAL_WINDOW_DAYS = 180  # outcome: churn within 180 days after the landmark
TRUE_PLAYBOOK_LOG_HR = {
    "proactive_success_call": {"SMB": -0.3, "Mid-Market": -0.7, "Enterprise": -0.5},
    "payment_recovery_workflow": {"SMB": -0.5, "Mid-Market": -0.4, "Enterprise": -0.8},
    "onboarding_relaunch": {"SMB": -0.6, "Mid-Market": -0.3, "Enterprise": -0.1},
    "expansion_discount": {"SMB": 0.1, "Mid-Market": -0.1, "Enterprise": 0.0},
}

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
PLAN_BASE_LOGINS = {"Starter": 120, "Pro": 300, "Enterprise": 800}
SEGMENT_BY_PLAN = {"Starter": "SMB", "Pro": "Mid-Market", "Enterprise": "Enterprise"}

SUPPORT_CATEGORIES = [
    "Billing",
    "Onboarding",
    "Bug report",
    "Feature request",
    "Integration",
    "Account access",
]
TICKETS_PER_MONTH = 0.35


def _month_start(d: date) -> date:
    return d.replace(day=1)


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def _month_end(d: date) -> date:
    return _add_months(d, 1) - timedelta(days=1)


def _sigmoid(x: float) -> float:
    return float(1.0 / (1.0 + np.exp(-x)))


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


def churn_time(exp_draw: float, rate: float, post_landmark_multiplier: float) -> float:
    """
    Invert the Weibull cumulative hazard for a single Exp(1) draw.

    Before the landmark the hazard is rate * h0(t); afterwards it is scaled by
    post_landmark_multiplier (the combined effect of any playbooks received).
    Replaying the same draw with different multipliers gives exact counterfactuals.
    """
    def inverse(h: float) -> float:
        return (h / (WEIBULL_SCALE * rate)) ** (1.0 / WEIBULL_SHAPE)

    h_landmark = WEIBULL_SCALE * rate * LANDMARK_DAYS**WEIBULL_SHAPE
    if exp_draw <= h_landmark:
        return inverse(exp_draw)
    return inverse(h_landmark + (exp_draw - h_landmark) / post_landmark_multiplier)


def potential_timeline(
    customer_id: str,
    signup: date,
    mrr: float,
    traits: dict,
    rngs: dict[str, np.random.Generator],
) -> dict[str, list[dict]]:
    """All events the customer would generate if they never churned before the snapshot."""
    usage: list[dict] = []
    payments: list[dict] = []
    tickets: list[dict] = []

    month = _month_start(signup)
    i = 0
    while month <= _month_start(SNAPSHOT_DATE):
        expected = traits["base_logins"] * np.exp(traits["usage_trend"] * i)
        logins = int(rngs["usage"].poisson(max(expected, 0.5)))
        for event_type, count in [
            ("login", logins),
            ("feature_used", int(logins * rngs["usage"].uniform(0.3, 0.8))),
            ("api_call", int(logins * rngs["usage"].uniform(0.5, 2.0))),
        ]:
            usage.append(
                {"customer_id": customer_id, "event_date": month, "event_type": event_type, "event_count": count}
            )

        failed = rngs["payments"].random() < traits["payment_fail_prob"]
        payments.append(
            {
                "customer_id": customer_id,
                "event_date": month,
                "event_type": "payment_failed" if failed else "payment_success",
                "amount": mrr,
            }
        )
        if failed and rngs["payments"].random() < 0.4:
            payments.append(
                {
                    "customer_id": customer_id,
                    "event_date": month.replace(day=15),
                    "event_type": "invoice_past_due",
                    "amount": mrr,
                }
            )
        month = _add_months(month, 1)
        i += 1

    span_days = max(1, (SNAPSHOT_DATE - signup).days)
    for _ in range(int(rngs["support"].poisson(TICKETS_PER_MONTH * span_days / 30))):
        roll = rngs["support"].random()
        if roll < traits["negative_share"]:
            sentiment = "negative"
        elif roll < traits["negative_share"] + 0.3:
            sentiment = "neutral"
        else:
            sentiment = "positive"
        tickets.append(
            {
                "customer_id": customer_id,
                "ticket_date": signup + timedelta(days=int(rngs["support"].integers(0, span_days))),
                "sentiment": sentiment,
                "category": str(rngs["support"].choice(SUPPORT_CATEGORIES)),
            }
        )

    return {"usage": usage, "payments": payments, "tickets": tickets}


def early_signals(timeline: dict[str, list[dict]], signup: date) -> dict[str, float]:
    """What customer success can see at the landmark (day LANDMARK_DAYS)."""
    landmark = signup + timedelta(days=LANDMARK_DAYS)
    logins = [
        e["event_count"]
        for e in timeline["usage"]
        if e["event_type"] == "login" and _month_end(e["event_date"]) <= landmark
    ]
    invoices = [
        e
        for e in timeline["payments"]
        if e["event_type"] != "invoice_past_due" and e["event_date"] <= landmark
    ]
    failures = sum(e["event_type"] == "payment_failed" for e in invoices)
    negative = sum(
        t["sentiment"] == "negative" for t in timeline["tickets"] if t["ticket_date"] <= landmark
    )
    return {
        "log_logins": float(np.log1p(np.mean(logins))) if logins else 0.0,
        "login_drop": max(0.0, float(np.log1p(logins[0]) - np.log1p(logins[-1]))) if len(logins) >= 2 else 0.0,
        "fail_share": failures / max(len(invoices), 1),
        "negative_tickets": float(negative),
    }


def assign_playbooks(rng: np.random.Generator, signals: dict, downgraded: bool) -> dict[str, bool]:
    """Historical CSM decisions: riskier-looking accounts are more likely treated."""
    probs = {
        "proactive_success_call": _sigmoid(
            -3.0 + 1.2 * signals["negative_tickets"] + 5.0 * signals["login_drop"]
        ),
        "payment_recovery_workflow": _sigmoid(-3.0 + 10.0 * signals["fail_share"]),
        "onboarding_relaunch": _sigmoid(-1.5 - 1.5 * (signals["log_logins"] - np.log1p(200))),
        "expansion_discount": _sigmoid(
            -3.2 + 2.0 * float(downgraded) + 4.0 * signals["login_drop"]
        ),
    }
    return {key: bool(rng.random() < p) for key, p in probs.items()}


def _truncate(timeline: dict[str, list[dict]], last_day: date) -> dict[str, list[dict]]:
    return {
        "usage": [e for e in timeline["usage"] if e["event_date"] <= last_day],
        "payments": [e for e in timeline["payments"] if e["event_date"] <= last_day],
        "tickets": [t for t in timeline["tickets"] if t["ticket_date"] <= last_day],
    }


def build_world(rng: np.random.Generator) -> tuple[pd.DataFrame, dict[str, list[dict]], list[dict]]:
    """Return customers (with hidden ground-truth columns), observed events and playbook touches."""
    names = generate_company_names(rng, NUM_CUSTOMERS)
    cohort_starts = [
        _add_months(_month_start(SNAPSHOT_DATE), -i) for i in range(MONTHS_HISTORY - 1, -1, -1)
    ]
    rngs = {
        "usage": np.random.default_rng(SEED + 1),
        "payments": np.random.default_rng(SEED + 2),
        "support": np.random.default_rng(SEED + 3),
        "playbooks": np.random.default_rng(SEED + 4),
    }

    rows: list[dict] = []
    events: dict[str, list[dict]] = {"usage": [], "payments": [], "tickets": []}
    touches: list[dict] = []

    for name in names:
        customer_id = str(uuid.uuid4())
        cohort_month = cohort_starts[int(rng.integers(0, len(cohort_starts)))]
        signup = min(cohort_month.replace(day=int(rng.integers(1, 29))), SNAPSHOT_DATE)
        in_anomaly = cohort_month == ANOMALY_COHORT

        plan = str(rng.choice(["Starter", "Pro", "Enterprise"], p=[0.45, 0.35, 0.20]))
        downgraded = bool(rng.random() < DOWNGRADE_RATE)
        if downgraded:
            plan = "Starter"
            mrr = round(float(rng.uniform(49, 99)), 2)
        else:
            low, high = PLAN_TIERS[plan]
            mrr = round(float(rng.uniform(low, high)), 2)
        segment = SEGMENT_BY_PLAN[plan]

        billing_troubled = rng.random() < 0.15
        traits = {
            "usage_trend": float(
                np.clip(rng.normal(-0.06 if in_anomaly else -0.01, 0.05), -0.2, 0.08)
            ),
            "base_logins": float(PLAN_BASE_LOGINS[plan] * rng.lognormal(0, 0.6)),
            "payment_fail_prob": float(
                rng.uniform(0.10, 0.35) if billing_troubled else rng.uniform(0.0, 0.06)
            )
            + (0.12 if in_anomaly else 0.0),
            "negative_share": float(rng.beta(2, 6)),
        }

        eta = (
            TRUE_COEFS["login_trend"] * traits["usage_trend"]
            + TRUE_COEFS["log_early_logins"] * np.log1p(traits["base_logins"])
            + TRUE_COEFS["payment_failure_rate"] * traits["payment_fail_prob"]
            + TRUE_COEFS["negative_sentiment_rate"] * traits["negative_share"]
            + TRUE_COEFS["downgraded"] * float(downgraded)
            + TRUE_COEFS["log_mrr"] * np.log1p(mrr)
            + (ANOMALY_COHORT_LOG_HR if in_anomaly else 0.0)
        )
        rate = float(np.exp(eta))
        exp_draw = float(rng.exponential())
        tenure_days = (SNAPSHOT_DATE - signup).days

        timeline = potential_timeline(customer_id, signup, mrr, traits, rngs)

        # Playbook decisions happen at the landmark, for accounts still active then.
        untreated_days = churn_time(exp_draw, rate, 1.0)
        alive_at_landmark = untreated_days > LANDMARK_DAYS and tenure_days >= LANDMARK_DAYS
        if alive_at_landmark:
            signals = early_signals(timeline, signup)
            playbooks = assign_playbooks(rngs["playbooks"], signals, downgraded)
        else:
            playbooks = {key: False for key in TRUE_PLAYBOOK_LOG_HR}

        log_hr = sum(TRUE_PLAYBOOK_LOG_HR[k][segment] for k, got in playbooks.items() if got)
        true_days = churn_time(exp_draw, rate, float(np.exp(log_hr)))
        churned = true_days <= tenure_days
        days_to_churn = max(1, int(true_days)) if churned else None

        observed = _truncate(
            timeline, signup + timedelta(days=days_to_churn) if churned else SNAPSHOT_DATE
        )
        for key in events:
            events[key].extend(observed[key])

        touched_at = signup + timedelta(days=LANDMARK_DAYS)
        for key, got in playbooks.items():
            if got:
                touches.append(
                    {
                        "id": str(uuid.uuid4()),
                        "customer_id": customer_id,
                        "treatment": key,
                        "touched_at": touched_at.isoformat(),
                    }
                )

        rows.append(
            {
                "id": customer_id,
                "organization_id": DEMO_ORG_ID,
                "stripe_customer_id": f"cus_{uuid.uuid4().hex[:14]}",
                "name": name,
                "cohort_month": cohort_month.isoformat(),
                "mrr": mrr,
                "signup_date": signup.isoformat(),
                "plan_tier": plan,
                "industry": str(rng.choice(INDUSTRIES)),
                "segment": segment,
                # Hidden ground truth (not exported to customers.csv)
                "churned": churned,
                "downgraded": downgraded,
                "days_to_churn": days_to_churn,
                "_rate": rate,
                "_exp_draw": exp_draw,
                "_playbooks": playbooks,
                "_alive_at_landmark": alive_at_landmark,
                "_tenure_days": tenure_days,
            }
        )

    return pd.DataFrame(rows), events, touches


def events_to_frames(events: dict[str, list[dict]]) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    def frame(rows: list[dict], date_col: str) -> pd.DataFrame:
        df = pd.DataFrame(rows)
        df.insert(0, "id", [str(uuid.uuid4()) for _ in range(len(df))])
        df[date_col] = df[date_col].apply(lambda d: d.isoformat())
        return df

    return (
        frame(events["usage"], "event_date"),
        frame(events["payments"], "event_date"),
        frame(events["tickets"], "ticket_date"),
    )


def build_churn_labels(customers: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "id": [str(uuid.uuid4()) for _ in range(len(customers))],
            "customer_id": customers["id"],
            "snapshot_date": SNAPSHOT_DATE.isoformat(),
            "churned": customers["churned"].astype(bool),
            "days_to_churn": customers["days_to_churn"],
            "downgraded": customers["downgraded"].astype(bool),
        }
    )


def build_cohort_anomalies(customers: pd.DataFrame, window_days: int = 90) -> pd.DataFrame:
    """
    Flag cohorts whose observed 90-day churn deviates from the pooled baseline.

    Uses only observed outcomes (what a real team would see) on cohorts old
    enough to have a full 90-day window, with a one-sided binomial z-score so
    small cohorts are not flagged on noise alone.
    """
    mature = customers[customers["_tenure_days"] >= window_days].copy()
    mature["early_churn"] = mature["churned"] & (
        mature["days_to_churn"].fillna(np.inf) <= window_days
    )
    cohorts = mature.groupby("cohort_month").agg(
        customer_count=("id", "count"), churned=("early_churn", "sum")
    )
    baseline = cohorts["churned"].sum() / cohorts["customer_count"].sum()

    rows: list[dict] = []
    for cohort_month, row in cohorts.iterrows():
        n = int(row["customer_count"])
        observed = float(row["churned"]) / n
        se = np.sqrt(baseline * (1 - baseline) / n)
        z = (observed - baseline) / se if se > 0 else 0.0

        if z >= 3:
            severity = "high"
        elif z >= 2:
            severity = "medium"
        elif z >= 1.5:
            severity = "low"
        else:
            continue

        month_label = date.fromisoformat(cohort_month).strftime("%B %Y")
        if cohort_month == ANOMALY_COHORT.isoformat():
            explanation = (
                f"{month_label} cohort churned {observed:.0%} in its first 90 days vs "
                f"{baseline:.0%} baseline, with elevated payment failures and "
                "faster usage decline."
            )
        else:
            explanation = (
                f"{month_label} cohort 90-day churn is {observed:.0%} vs {baseline:.0%} "
                "baseline; review onboarding and payment health."
            )

        rows.append(
            {
                "id": str(uuid.uuid4()),
                "organization_id": DEMO_ORG_ID,
                "cohort_month": cohort_month,
                "metric": "churn_rate_90d_pct",
                "expected_value": round(baseline * 100, 2),
                "observed_value": round(observed * 100, 2),
                "deviation_pct": round((observed - baseline) / max(baseline, 1e-4) * 100, 2),
                "severity": severity,
                "explanation": explanation,
            }
        )

    columns = [
        "id",
        "organization_id",
        "cohort_month",
        "metric",
        "expected_value",
        "observed_value",
        "deviation_pct",
        "severity",
        "explanation",
    ]
    return pd.DataFrame(rows, columns=columns)


def true_playbook_effects(customers: pd.DataFrame) -> list[dict]:
    """
    Ground-truth ATE per playbook and segment, in percentage points of churn
    avoided within CAUSAL_WINDOW_DAYS after the landmark.

    For every customer in the causal population (active at the landmark, with
    a full outcome window before the snapshot) we replay the same random draw
    with and without the playbook, other playbooks held as received.
    """
    horizon = LANDMARK_DAYS + CAUSAL_WINDOW_DAYS
    population = customers[
        customers["_alive_at_landmark"] & (customers["_tenure_days"] >= horizon)
    ]
    results: list[dict] = []

    for key in TRUE_PLAYBOOK_LOG_HR:
        for segment in ["SMB", "Mid-Market", "Enterprise"]:
            diffs: list[float] = []
            for _, c in population[population["segment"] == segment].iterrows():
                others = sum(
                    TRUE_PLAYBOOK_LOG_HR[k][segment]
                    for k, got in c["_playbooks"].items()
                    if got and k != key
                )
                effect = TRUE_PLAYBOOK_LOG_HR[key][segment]
                t1 = churn_time(c["_exp_draw"], c["_rate"], float(np.exp(others + effect)))
                t0 = churn_time(c["_exp_draw"], c["_rate"], float(np.exp(others)))
                diffs.append(float(t0 <= horizon) - float(t1 <= horizon))
            results.append(
                {
                    "treatment": key,
                    "segment": segment,
                    "true_ate_pp": round(float(np.mean(diffs)) * 100, 2) if diffs else 0.0,
                    "true_log_hr": TRUE_PLAYBOOK_LOG_HR[key][segment],
                    "population": len(diffs),
                }
            )

    return results


def main() -> None:
    rng = np.random.default_rng(SEED)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    customers, events, touches = build_world(rng)
    hidden = ["churned", "downgraded", "days_to_churn"] + [
        c for c in customers.columns if c.startswith("_")
    ]
    customer_export = customers.drop(columns=hidden)

    usage, payments, support = events_to_frames(events)
    churn_labels = build_churn_labels(customers)
    anomalies = build_cohort_anomalies(customers)
    playbook_touches = pd.DataFrame(
        touches, columns=["id", "customer_id", "treatment", "touched_at"]
    )

    customer_export.to_csv(OUTPUT_DIR / "customers.csv", index=False)
    usage.to_csv(OUTPUT_DIR / "usage_events.csv", index=False)
    payments.to_csv(OUTPUT_DIR / "payment_events.csv", index=False)
    support.to_csv(OUTPUT_DIR / "support_sentiment.csv", index=False)
    churn_labels.to_csv(OUTPUT_DIR / "churn_labels.csv", index=False)
    anomalies.to_csv(OUTPUT_DIR / "cohort_anomalies.csv", index=False)
    playbook_touches.to_csv(OUTPUT_DIR / "playbook_touches.csv", index=False)

    meta = {
        "seed": SEED,
        "num_customers": len(customers),
        "snapshot_date": SNAPSHOT_DATE.isoformat(),
        "observed_churn_rate": round(float(customers["churned"].mean()), 3),
        "downgrade_rate": round(float(customers["downgraded"].mean()), 3),
        "organization_id": DEMO_ORG_ID,
        "anomaly_cohort": ANOMALY_COHORT.isoformat(),
        "weibull": {"shape": WEIBULL_SHAPE, "scale": WEIBULL_SCALE},
        "true_coefficients": TRUE_COEFS,
        "anomaly_cohort_log_hr": ANOMALY_COHORT_LOG_HR,
        "causal_design": {
            "landmark_days": LANDMARK_DAYS,
            "outcome_window_days": CAUSAL_WINDOW_DAYS,
        },
        "true_playbook_effects": true_playbook_effects(customers),
    }
    (OUTPUT_DIR / "metadata.json").write_text(json.dumps(meta, indent=2) + "\n")

    print(f"Generated {len(customers)} customers → {OUTPUT_DIR}")
    print(f"  Observed churn by snapshot: {meta['observed_churn_rate']:.1%}")
    print(f"  Downgrade rate: {meta['downgrade_rate']:.1%}")
    print(f"  Playbook touches: {len(playbook_touches)}")
    print(f"  Anomalies: {len(anomalies)} cohort flags")


if __name__ == "__main__":
    main()
