export type CustomerWithRisk = {
  id: string;
  name: string;
  mrr: number;
  segment: string;
  plan_tier: string;
  cohort_month: string;
  industry: string;
  signup_date: string;
  churn_risk_30d: number;
  churn_risk_90d: number;
  median_days_to_churn: number | null;
  confidence_interval: {
    median_days: number | null;
    lower_days: number | null;
    upper_days: number | null;
  } | null;
};

export type CohortAnomaly = {
  id: string;
  cohort_month: string;
  metric: string;
  expected_value: number;
  observed_value: number;
  deviation_pct: number;
  severity: string;
  explanation: string;
};

export type DashboardStats = {
  totalCustomers: number;
  highRiskPct: number;
  mediumRiskPct: number;
  lowRiskPct: number;
  cohortTrend: { cohort: string; churnRate: number }[];
  anomalies: CohortAnomaly[];
};

export type UsagePoint = {
  month: string;
  logins: number;
  feature_used: number;
  api_call: number;
};

export type CausalEstimate = {
  id: string;
  treatment: string;
  segment: string;
  ate: number;
  confidence_lower: number;
  confidence_upper: number;
  sample_size: number;
};

export type PlaybookRow = CausalEstimate & {
  label: string;
  description: string;
  action: string;
};
