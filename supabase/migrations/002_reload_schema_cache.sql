-- Run after 001_initial_schema.sql if REST API can't see your tables
-- (seed script says "schema not found" but Table Editor shows customers).
-- Safe to run anytime.

-- Official Supabase fix for stale PostgREST notification queue:
-- https://supabase.com/docs/guides/troubleshooting/postgrest-not-recognizing-new-columns-or-functions-bd75f5
SELECT pg_notification_queue_usage();

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
