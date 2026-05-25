-- Customer Health Intelligence — initial schema with multi-tenant RLS
-- Run in Supabase SQL Editor or via Supabase CLI

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Organizations (tenants)
-- ---------------------------------------------------------------------------

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- Demo organization (seeded by synthetic data script)
INSERT INTO organizations (id, name, slug)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Acme analytics demo',
  'acme-demo'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Core customer data
-- ---------------------------------------------------------------------------

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  name TEXT NOT NULL,
  cohort_month DATE NOT NULL,
  mrr DECIMAL(10, 2) NOT NULL DEFAULT 0,
  signup_date DATE NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('Starter', 'Pro', 'Enterprise')),
  industry TEXT NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('SMB', 'Mid-Market', 'Enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, stripe_customer_id)
);

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'feature_used', 'api_call')),
  event_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('payment_success', 'payment_failed', 'invoice_past_due')),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  ticket_date DATE NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE churn_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  churned BOOLEAN NOT NULL DEFAULT false,
  days_to_churn INT,
  downgraded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, snapshot_date)
);

CREATE TABLE survival_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  churn_risk_30d DECIMAL(3, 2) NOT NULL CHECK (churn_risk_30d >= 0 AND churn_risk_30d <= 1),
  churn_risk_90d DECIMAL(3, 2) NOT NULL CHECK (churn_risk_90d >= 0 AND churn_risk_90d <= 1),
  median_days_to_churn INT,
  confidence_interval JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, prediction_date)
);

CREATE TABLE causal_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  treatment TEXT NOT NULL,
  segment TEXT NOT NULL,
  ate DECIMAL(5, 2) NOT NULL,
  confidence_lower DECIMAL(5, 2) NOT NULL,
  confidence_upper DECIMAL(5, 2) NOT NULL,
  sample_size INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  treatment_group_id INT NOT NULL,
  control_group_id INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  "group" TEXT NOT NULL CHECK ("group" IN ('treatment', 'control')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, customer_id)
);

CREATE TABLE experiment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  treatment_churn_rate DECIMAL(4, 3) NOT NULL,
  control_churn_rate DECIMAL(4, 3) NOT NULL,
  uplift_pct DECIMAL(5, 2) NOT NULL,
  p_value DECIMAL(5, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (experiment_id)
);

CREATE TABLE cohort_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cohort_month DATE NOT NULL,
  metric TEXT NOT NULL,
  expected_value DECIMAL(10, 2) NOT NULL,
  observed_value DECIMAL(10, 2) NOT NULL,
  deviation_pct DECIMAL(5, 2) NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_customers_organization_id ON customers(organization_id);
CREATE INDEX idx_customers_cohort_month ON customers(cohort_month);
CREATE INDEX idx_usage_events_customer_date ON usage_events(customer_id, event_date);
CREATE INDEX idx_payment_events_customer_date ON payment_events(customer_id, event_date);
CREATE INDEX idx_churn_labels_customer ON churn_labels(customer_id);
CREATE INDEX idx_survival_predictions_customer_date ON survival_predictions(customer_id, prediction_date);
CREATE INDEX idx_cohort_anomalies_org_cohort ON cohort_anomalies(organization_id, cohort_month);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.customer_organization_id(customer_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM customers WHERE id = customer_uuid;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE survival_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE causal_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_anomalies ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (public.user_belongs_to_organization(id));

-- Organization members
CREATE POLICY "Members can view org membership"
  ON organization_members FOR SELECT
  USING (public.user_belongs_to_organization(organization_id));

CREATE POLICY "Owners can manage org membership"
  ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

-- Customers
CREATE POLICY "Members can view customers in their org"
  ON customers FOR SELECT
  USING (public.user_belongs_to_organization(organization_id));

CREATE POLICY "Members can insert customers in their org"
  ON customers FOR INSERT
  WITH CHECK (public.user_belongs_to_organization(organization_id));

CREATE POLICY "Members can update customers in their org"
  ON customers FOR UPDATE
  USING (public.user_belongs_to_organization(organization_id));

-- Child tables (scoped via customer)
CREATE POLICY "Members can view usage events"
  ON usage_events FOR SELECT
  USING (public.user_belongs_to_organization(public.customer_organization_id(customer_id)));

CREATE POLICY "Members can view payment events"
  ON payment_events FOR SELECT
  USING (public.user_belongs_to_organization(public.customer_organization_id(customer_id)));

CREATE POLICY "Members can view support sentiment"
  ON support_sentiment FOR SELECT
  USING (public.user_belongs_to_organization(public.customer_organization_id(customer_id)));

CREATE POLICY "Members can view churn labels"
  ON churn_labels FOR SELECT
  USING (public.user_belongs_to_organization(public.customer_organization_id(customer_id)));

CREATE POLICY "Members can view survival predictions"
  ON survival_predictions FOR SELECT
  USING (public.user_belongs_to_organization(public.customer_organization_id(customer_id)));

-- Org-scoped tables
CREATE POLICY "Members can view causal estimates"
  ON causal_estimates FOR SELECT
  USING (public.user_belongs_to_organization(organization_id));

CREATE POLICY "Members can view experiments"
  ON experiments FOR SELECT
  USING (public.user_belongs_to_organization(organization_id));

CREATE POLICY "Members can view experiment assignments"
  ON experiment_assignments FOR SELECT
  USING (
    public.user_belongs_to_organization(
      public.customer_organization_id(customer_id)
    )
  );

CREATE POLICY "Members can view experiment results"
  ON experiment_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM experiments e
      WHERE e.id = experiment_results.experiment_id
        AND public.user_belongs_to_organization(e.organization_id)
    )
  );

CREATE POLICY "Members can view cohort anomalies"
  ON cohort_anomalies FOR SELECT
  USING (public.user_belongs_to_organization(organization_id));

-- ---------------------------------------------------------------------------
-- Auto-assign new users to demo org (portfolio demo convenience)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES ('00000000-0000-4000-8000-000000000001', NEW.id, 'member');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Refresh PostgREST schema cache so the API sees new tables immediately
NOTIFY pgrst, 'reload schema';
