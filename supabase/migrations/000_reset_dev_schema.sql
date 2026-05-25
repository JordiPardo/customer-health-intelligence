-- DEV ONLY — wipe partial/failed migrations and start fresh.
-- Run this in Supabase SQL Editor BEFORE 001_initial_schema.sql if you see
-- errors like "relation organizations already exists".

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.customer_organization_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_belongs_to_organization(UUID) CASCADE;

DROP TABLE IF EXISTS experiment_results CASCADE;
DROP TABLE IF EXISTS experiment_assignments CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS causal_estimates CASCADE;
DROP TABLE IF EXISTS survival_predictions CASCADE;
DROP TABLE IF EXISTS churn_labels CASCADE;
DROP TABLE IF EXISTS support_sentiment CASCADE;
DROP TABLE IF EXISTS payment_events CASCADE;
DROP TABLE IF EXISTS usage_events CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS cohort_anomalies CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

NOTIFY pgrst, 'reload schema';
