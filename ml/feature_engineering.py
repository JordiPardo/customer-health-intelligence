"""
Point-in-time feature engineering for churn modelling.

Every feature is computed "as of" a date, using only events visible on that
date (usage months that have fully elapsed, invoices and tickets dated on or
before it). This is what makes the pipeline leak-free:

- Survival model: features as of a cutoff date, outcome = churn in the next
  HORIZON days (see survival_dataset). Tenure at the cutoff is a legitimate
  covariate because the time axis is "days since cutoff", not tenure.
- Causal playbooks: features as of each account's landmark day (when the
  playbook decision was made), outcome = churn in the following window
  (see landmark_dataset).
- Scoring: features as of the snapshot date for currently active accounts.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import numpy as np
import pandas as pd

# Features used by the Cox model. Units match TRUE_COEFS in
# scripts/generate_synthetic_data.py so estimates can be compared to the truth.
MODEL_FEATURES = [
    "login_trend",
    "log_early_logins",
    "payment_failure_rate",
    "negative_sentiment_rate",
    "downgraded",
    "log_mrr",
    "log_tenure",
]

# Signals customer success could see when deciding on a playbook.
CAUSAL_COVARIATES = [
    "log_early_logins",
    "login_drop",
    "raw_failure_share",
    "negative_tickets",
    "downgraded",
    "log_mrr",
]

PLAYBOOK_KEYS = [
    "proactive_success_call",
    "payment_recovery_workflow",
    "onboarding_relaunch",
    "expansion_discount",
]

MIN_MONTHS_FOR_TREND = 3
EARLY_MONTHS = 3

# Rates measured on few observations are noisy, and noisy covariates bias
# hazard ratios towards zero (attenuation). Each noisy signal is therefore
# replaced by its empirical-Bayes posterior mean (regression calibration):
# accounts with little history are pulled towards the population average.


@dataclass
class Frames:
    customers: pd.DataFrame
    labels: pd.DataFrame
    usage: pd.DataFrame
    payments: pd.DataFrame
    support: pd.DataFrame
    touches: pd.DataFrame
    snapshot: pd.Timestamp


def prepare_frames(data: dict[str, pd.DataFrame]) -> Frames:
    """Normalise ids and dates once; add churn_date to customers."""
    customers = data["customers"].rename(columns={"id": "customer_id"}).copy()
    customers["customer_id"] = customers["customer_id"].astype(str)
    customers["signup_date"] = pd.to_datetime(customers["signup_date"])

    labels = data["churn_labels"].copy()
    labels["customer_id"] = labels["customer_id"].astype(str)
    labels["snapshot_date"] = pd.to_datetime(labels["snapshot_date"])
    labels = labels.sort_values("snapshot_date").groupby("customer_id").tail(1)
    labels["churned"] = labels["churned"].astype(str).str.lower().isin(["true", "1"])

    customers = customers.merge(
        labels[["customer_id", "churned", "days_to_churn", "downgraded"]],
        on="customer_id",
        how="inner",
    )
    customers["downgraded"] = customers["downgraded"].astype(str).str.lower().isin(["true", "1"])
    customers["churn_date"] = pd.NaT
    churned = customers["churned"] & customers["days_to_churn"].notna()
    customers.loc[churned, "churn_date"] = customers.loc[churned, "signup_date"] + pd.to_timedelta(
        customers.loc[churned, "days_to_churn"].astype(float), unit="D"
    )

    usage = data["usage_events"]
    usage = usage[usage["event_type"] == "login"].copy()
    usage["customer_id"] = usage["customer_id"].astype(str)
    usage["event_date"] = pd.to_datetime(usage["event_date"])
    usage["month_end"] = usage["event_date"] + pd.offsets.MonthEnd(0)
    usage = usage.sort_values(["customer_id", "event_date"])

    payments = data["payment_events"].copy()
    payments["customer_id"] = payments["customer_id"].astype(str)
    payments["event_date"] = pd.to_datetime(payments["event_date"])

    support = data["support_sentiment"].copy()
    support["customer_id"] = support["customer_id"].astype(str)
    support["ticket_date"] = pd.to_datetime(support["ticket_date"])

    touches = data.get("playbook_touches")
    if touches is None or touches.empty:
        touches = pd.DataFrame(columns=["customer_id", "treatment", "touched_at"])
    touches = touches.copy()
    touches["customer_id"] = touches["customer_id"].astype(str)
    touches["touched_at"] = pd.to_datetime(touches["touched_at"])

    return Frames(
        customers=customers,
        labels=labels,
        usage=usage,
        payments=payments,
        support=support,
        touches=touches,
        snapshot=labels["snapshot_date"].max(),
    )


def _visible(events: pd.DataFrame, as_of: pd.Series, date_col: str) -> pd.DataFrame:
    """Rows dated on or before each customer's as-of date."""
    merged = events.merge(as_of.rename("as_of"), left_on="customer_id", right_index=True)
    return merged[merged[date_col] <= merged["as_of"]]


def _login_stats(counts: np.ndarray) -> dict[str, float]:
    """Raw login trend + sampling variance, early engagement and early drop."""
    if counts.size == 0:
        return {"trend_raw": np.nan, "trend_var": np.nan, "early_logins": np.nan, "login_drop": 0.0}

    early = counts[:EARLY_MONTHS]
    stats = {
        "early_logins": float(early.mean()),
        "login_drop": max(0.0, float(np.log1p(early[0]) - np.log1p(early[-1]))),
        "trend_raw": np.nan,
        "trend_var": np.nan,
    }
    if counts.size >= MIN_MONTHS_FOR_TREND:
        # Monthly log-change in logins (slope of log1p(logins) on month index).
        months = np.arange(counts.size)
        stats["trend_raw"] = float(np.polyfit(months, np.log1p(counts), 1)[0])
        # Delta method: Var[log Poisson(λ)] ≈ 1/λ, so Var[slope] ≈ (1/λ) / Sxx.
        sxx = float(((months - months.mean()) ** 2).sum())
        stats["trend_var"] = (1.0 / max(counts.mean(), 1.0)) / sxx
    return stats


def _shrink_rates(successes: pd.Series, trials: pd.Series) -> pd.Series:
    """
    Beta-binomial empirical Bayes: estimate the prior from the data by the
    method of moments, then return each account's posterior mean rate.
    """
    has_data = trials > 0
    p = successes[has_data].sum() / max(trials[has_data].sum(), 1)
    rates = successes[has_data] / trials[has_data]
    sampling_var = (p * (1 - p) / trials[has_data]).mean()
    between_var = max(float(rates.var() - sampling_var), 1e-6)
    # For a Beta(a, b) prior, a + b = p(1-p) / Var - 1 acts as "pseudo-trials".
    prior_weight = max(p * (1 - p) / between_var - 1, 0.5)
    return (successes + p * prior_weight) / (trials + prior_weight)


def _shrink_trends(raw: pd.Series, var: pd.Series) -> pd.Series:
    """Empirical-Bayes shrinkage of noisy per-customer slopes."""
    known = raw.notna()
    if known.sum() < 10:
        return raw.fillna(0.0)
    mu = float(np.average(raw[known], weights=1.0 / var[known]))
    # Method of moments: true between-customer variance = total - noise.
    tau2 = max(float(raw[known].var() - var[known].mean()), 1e-6)
    reliability = tau2 / (tau2 + var)
    return (mu + reliability * (raw - mu)).fillna(mu)


def features_as_of(frames: Frames, as_of: pd.Series) -> pd.DataFrame:
    """
    One row per customer in `as_of` (index = customer_id, values = timestamps),
    using only information visible on that date.
    """
    customers = frames.customers.set_index("customer_id").loc[as_of.index]

    usage = frames.usage.merge(as_of.rename("as_of"), left_on="customer_id", right_index=True)
    usage = usage[usage["month_end"] <= usage["as_of"]]
    login_counts = {
        cid: g["event_count"].astype(float).to_numpy() for cid, g in usage.groupby("customer_id")
    }

    payments = _visible(frames.payments, as_of, "event_date")
    invoices = payments[payments["event_type"].isin(["payment_success", "payment_failed"])]
    pay = pd.DataFrame(
        {
            "invoices": invoices.groupby("customer_id").size(),
            "failures": invoices[invoices["event_type"] == "payment_failed"].groupby("customer_id").size(),
            "past_due": payments[payments["event_type"] == "invoice_past_due"].groupby("customer_id").size(),
        }
    ).reindex(as_of.index).fillna(0)

    tickets = _visible(frames.support, as_of, "ticket_date")
    tix = pd.DataFrame(
        {
            "tickets": tickets.groupby("customer_id").size(),
            "negative": tickets[tickets["sentiment"] == "negative"].groupby("customer_id").size(),
        }
    ).reindex(as_of.index).fillna(0)

    touches = _visible(frames.touches, as_of, "touched_at")
    touched = set(zip(touches["customer_id"], touches["treatment"]))

    payment_rate = _shrink_rates(pay["failures"], pay["invoices"])
    sentiment_rate = _shrink_rates(tix["negative"], tix["tickets"])

    rows: list[dict] = []
    for cid, as_of_date in as_of.items():
        c = customers.loc[cid]
        login = _login_stats(login_counts.get(cid, np.array([])))
        tenure_days = max((as_of_date - c["signup_date"]).days, 1)
        p, t = pay.loc[cid], tix.loc[cid]

        row = {
            "customer_id": cid,
            "as_of": as_of_date.date(),
            "signup_date": c["signup_date"].date(),
            "cohort_month": c["cohort_month"],
            "segment": c["segment"],
            "plan_tier": c["plan_tier"],
            "industry": c["industry"],
            "mrr": float(c["mrr"]),
            "log_mrr": float(np.log1p(c["mrr"])),
            "downgraded": int(bool(c["downgraded"])),
            "tenure_days": tenure_days,
            "log_tenure": float(np.log1p(tenure_days)),
            "login_trend_raw": login["trend_raw"],
            "login_trend_var": login["trend_var"],
            "early_logins": login["early_logins"],
            "login_drop": login["login_drop"],
            "invoices": int(p["invoices"]),
            "raw_failure_share": float(p["failures"] / max(p["invoices"], 1)),
            "payment_failure_rate": float(payment_rate.loc[cid]),
            "past_due_count": int(p["past_due"]),
            "ticket_count": int(t["tickets"]),
            "negative_tickets": int(t["negative"]),
            "negative_sentiment_rate": float(sentiment_rate.loc[cid]),
        }
        for key in PLAYBOOK_KEYS:
            row[f"pb_{key}"] = int((cid, key) in touched)
        rows.append(row)

    features = pd.DataFrame(rows)
    features["login_trend"] = _shrink_trends(features["login_trend_raw"], features["login_trend_var"])
    early = features["early_logins"]
    features["early_logins"] = early.fillna(early.median() if early.notna().any() else 0.0)
    features["log_early_logins"] = np.log1p(features["early_logins"])
    return features


def _active_on(frames: Frames, when: pd.Timestamp) -> pd.DataFrame:
    c = frames.customers
    return c[(c["signup_date"] < when) & (c["churn_date"].isna() | (c["churn_date"] > when))]


def survival_dataset(frames: Frames, cutoff: date, horizon_days: int) -> pd.DataFrame:
    """
    Accounts active on `cutoff`, features as of the cutoff, and the outcome
    "days from cutoff to churn" censored at the horizon (or the snapshot).
    """
    cutoff_ts = pd.Timestamp(cutoff)
    active = _active_on(frames, cutoff_ts)
    features = features_as_of(frames, pd.Series(cutoff_ts, index=active["customer_id"].values))

    end = min(cutoff_ts + pd.Timedelta(days=horizon_days), frames.snapshot)
    churn_dates = active.set_index("customer_id").loc[features["customer_id"], "churn_date"]
    event = (churn_dates.notna() & (churn_dates <= end)).to_numpy()
    duration = np.where(
        event,
        (churn_dates - cutoff_ts).dt.days.clip(lower=1).fillna(0).to_numpy(),
        (end - cutoff_ts).days,
    )
    features["event"] = event.astype(int)
    features["duration"] = duration.astype(float)
    return features


def scoring_dataset(frames: Frames) -> pd.DataFrame:
    """Accounts active at the snapshot, features as of the snapshot."""
    active = _active_on(frames, frames.snapshot)
    return features_as_of(frames, pd.Series(frames.snapshot, index=active["customer_id"].values))


def landmark_dataset(frames: Frames, landmark_days: int, window_days: int) -> pd.DataFrame:
    """
    Causal population: accounts active at their landmark day with a full
    outcome window before the snapshot. Features as of the landmark,
    outcome = churned within `window_days` after the landmark.
    """
    c = frames.customers.copy()
    c["landmark"] = c["signup_date"] + pd.Timedelta(days=landmark_days)
    c["window_end"] = c["landmark"] + pd.Timedelta(days=window_days)
    eligible = c[
        (c["window_end"] <= frames.snapshot)
        & (c["churn_date"].isna() | (c["churn_date"] > c["landmark"]))
    ]
    features = features_as_of(frames, eligible.set_index("customer_id")["landmark"])
    window_end = eligible.set_index("customer_id").loc[features["customer_id"], "window_end"]
    churn_dates = eligible.set_index("customer_id").loc[features["customer_id"], "churn_date"]
    features["churned_in_window"] = (churn_dates.notna() & (churn_dates <= window_end)).astype(int).to_numpy()
    return features
