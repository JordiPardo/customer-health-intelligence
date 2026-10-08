import { DEMO_ORG_ID, fetchAllRows, getDemoDb } from "@/lib/queries/db";
import { getRiskLevel } from "@/lib/risk";
import type { CohortAnomaly, DashboardStats } from "@/lib/types";

/** Cohort churn is compared on a fixed early-life window so cohorts of different ages line up. */
const COHORT_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getDemoDb();

  const [{ data: predictions }, { data: customers }, { data: labels }] =
    await Promise.all([
      fetchAllRows<{ churn_risk_90d: number }>((from, to) =>
        supabase
          .from("survival_predictions")
          .select("churn_risk_90d, customers!inner(organization_id)")
          .eq("customers.organization_id", DEMO_ORG_ID)
          .order("id")
          .range(from, to),
      ),
      fetchAllRows<{ id: string; cohort_month: string; signup_date: string }>(
        (from, to) =>
          supabase
            .from("customers")
            .select("id, cohort_month, signup_date")
            .eq("organization_id", DEMO_ORG_ID)
            .order("id")
            .range(from, to),
      ),
      fetchAllRows<{
        customer_id: string;
        churned: boolean;
        days_to_churn: number | null;
        snapshot_date: string;
      }>((from, to) =>
        supabase
          .from("churn_labels")
          .select(
            "customer_id, churned, days_to_churn, snapshot_date, customers!inner(organization_id)",
          )
          .eq("customers.organization_id", DEMO_ORG_ID)
          .order("id")
          .range(from, to),
      ),
    ]);

  const levels = predictions.map((p) => getRiskLevel(Number(p.churn_risk_90d)));
  const total = levels.length || 1;
  const share = (level: string) =>
    Math.round((levels.filter((l) => l === level).length / total) * 100);

  // Early churn by signup cohort: share of each cohort that churned within
  // its first 90 days, counting only cohorts old enough to have a full window.
  const snapshot = labels.reduce(
    (max, l) => (l.snapshot_date > max ? l.snapshot_date : max),
    "",
  );
  const labelByCustomer = new Map(labels.map((l) => [l.customer_id, l]));
  const cohortMap = new Map<string, { total: number; churned: number }>();
  for (const c of customers) {
    const tenureDays =
      (Date.parse(snapshot) - Date.parse(c.signup_date)) / DAY_MS;
    if (!snapshot || tenureDays < COHORT_WINDOW_DAYS) continue;
    const label = labelByCustomer.get(c.id);
    const entry = cohortMap.get(c.cohort_month) ?? { total: 0, churned: 0 };
    entry.total += 1;
    if (
      label?.churned &&
      label.days_to_churn != null &&
      label.days_to_churn <= COHORT_WINDOW_DAYS
    ) {
      entry.churned += 1;
    }
    cohortMap.set(c.cohort_month, entry);
  }

  const cohortTrend = Array.from(cohortMap.entries())
    .map(([cohort, stats]) => ({
      cohort: cohort.slice(0, 7),
      churnRate: stats.total > 0 ? stats.churned / stats.total : 0,
    }))
    .sort((a, b) => a.cohort.localeCompare(b.cohort));

  const { data: anomalies } = await supabase
    .from("cohort_anomalies")
    .select("*")
    .eq("organization_id", DEMO_ORG_ID)
    .order("severity", { ascending: true })
    .order("deviation_pct", { ascending: false });

  return {
    totalCustomers: predictions.length,
    highRiskPct: share("high"),
    mediumRiskPct: share("medium"),
    lowRiskPct: share("low"),
    cohortTrend,
    anomalies: (anomalies ?? []) as CohortAnomaly[],
  };
}
