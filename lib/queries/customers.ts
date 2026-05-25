import { DEMO_ORG_ID, getDemoDb } from "@/lib/queries/db";
import type { CustomerWithRisk, UsagePoint } from "@/lib/types";

function mapCustomer(
  row: Record<string, unknown>,
): CustomerWithRisk | null {
  const preds = row.survival_predictions as
    | Array<{
        churn_risk_30d: number;
        churn_risk_90d: number;
        median_days_to_churn: number | null;
        confidence_interval: unknown;
      }>
    | null;

  const pred = preds?.[0];
  if (!pred) return null;

  let ci: CustomerWithRisk["confidence_interval"] = null;
  if (pred.confidence_interval) {
    const raw =
      typeof pred.confidence_interval === "string"
        ? JSON.parse(pred.confidence_interval)
        : pred.confidence_interval;
    ci = raw as CustomerWithRisk["confidence_interval"];
  }

  return {
    id: row.id as string,
    name: row.name as string,
    mrr: Number(row.mrr),
    segment: row.segment as string,
    plan_tier: row.plan_tier as string,
    cohort_month: row.cohort_month as string,
    industry: row.industry as string,
    signup_date: row.signup_date as string,
    churn_risk_30d: Number(pred.churn_risk_30d),
    churn_risk_90d: Number(pred.churn_risk_90d),
    median_days_to_churn: pred.median_days_to_churn,
    confidence_interval: ci,
  };
}

const customerSelect = `
  id, name, mrr, segment, plan_tier, cohort_month, industry, signup_date,
  survival_predictions (churn_risk_30d, churn_risk_90d, median_days_to_churn, confidence_interval)
`;

export async function getCustomers(): Promise<CustomerWithRisk[]> {
  const supabase = getDemoDb();
  const { data, error } = await supabase
    .from("customers")
    .select(customerSelect)
    .eq("organization_id", DEMO_ORG_ID)
    .order("name");

  if (error) {
    console.error("getCustomers", error);
    return [];
  }

  return (data ?? [])
    .map((row) => mapCustomer(row as Record<string, unknown>))
    .filter((c): c is CustomerWithRisk => c !== null);
}

export async function getCustomerById(
  id: string,
): Promise<CustomerWithRisk | null> {
  const supabase = getDemoDb();
  const { data, error } = await supabase
    .from("customers")
    .select(customerSelect)
    .eq("organization_id", DEMO_ORG_ID)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapCustomer(data as Record<string, unknown>);
}

export async function getCustomerUsage(
  customerId: string,
): Promise<UsagePoint[]> {
  const supabase = getDemoDb();
  const { data } = await supabase
    .from("usage_events")
    .select("event_date, event_type, event_count")
    .eq("customer_id", customerId)
    .order("event_date");

  const byMonth = new Map<string, UsagePoint>();

  for (const row of data ?? []) {
    const month = String(row.event_date).slice(0, 7);
    const point = byMonth.get(month) ?? {
      month,
      logins: 0,
      feature_used: 0,
      api_call: 0,
    };
    const type = row.event_type as keyof Omit<UsagePoint, "month">;
    if (type in point) {
      point[type] += Number(row.event_count);
    }
    byMonth.set(month, point);
  }

  return Array.from(byMonth.values()).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
}
