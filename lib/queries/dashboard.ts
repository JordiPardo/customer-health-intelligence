import { DEMO_ORG_ID, getDemoDb } from "@/lib/queries/db";
import type { CohortAnomaly, DashboardStats } from "@/lib/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getDemoDb();

  const { count: totalCustomers } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", DEMO_ORG_ID);

  const { data: predictions } = await supabase
    .from("survival_predictions")
    .select("churn_risk_30d, customers!inner(organization_id)")
    .eq("customers.organization_id", DEMO_ORG_ID);

  const risks = (predictions ?? []).map((p) => Number(p.churn_risk_30d));
  const total = risks.length || 1;
  const high = risks.filter((r) => r > 0.6).length;
  const medium = risks.filter((r) => r >= 0.3 && r <= 0.6).length;
  const low = risks.filter((r) => r < 0.3).length;

  const { data: customers } = await supabase
    .from("customers")
    .select("id, cohort_month")
    .eq("organization_id", DEMO_ORG_ID);

  const { data: labels } = await supabase
    .from("churn_labels")
    .select("customer_id, churned");

  const customerIds = new Set((customers ?? []).map((c) => c.id as string));
  const churnByCustomer = new Map(
    (labels ?? [])
      .filter((l) => customerIds.has(l.customer_id as string))
      .map((l) => [l.customer_id as string, Boolean(l.churned)]),
  );

  const cohortMap = new Map<string, { total: number; churned: number }>();
  for (const row of customers ?? []) {
    const cohort = String(row.cohort_month);
    const entry = cohortMap.get(cohort) ?? { total: 0, churned: 0 };
    entry.total += 1;
    if (churnByCustomer.get(row.id as string)) entry.churned += 1;
    cohortMap.set(cohort, entry);
  }

  const cohortTrend = Array.from(cohortMap.entries())
    .map(([cohort, stats]) => ({
      cohort,
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
    totalCustomers: totalCustomers ?? 0,
    highRiskPct: Math.round((high / total) * 100),
    mediumRiskPct: Math.round((medium / total) * 100),
    lowRiskPct: Math.round((low / total) * 100),
    cohortTrend,
    anomalies: (anomalies ?? []) as CohortAnomaly[],
  };
}
