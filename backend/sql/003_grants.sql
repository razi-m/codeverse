-- Fixes a pre-existing gap in schema.sql: the original `grant ... to anon`
-- statement never included service_role, because service_role wasn't
-- available/in use when schema.sql was written (D20). Postgres checks
-- table-level GRANTs before RLS policies are even evaluated, so without
-- this, the service-role key introduced in 002_auth.sql (and used by
-- backend/src/services/supabaseAdmin.ts) is denied on every table with a
-- flat "permission denied for table X" (Postgres 42501) — including the
-- pre-existing anon-accessible tables, not just the two new ones.
--
-- This grant does not weaken anything: service_role already bypasses RLS
-- by design (it's meant to be used only from a trusted backend, never the
-- browser — see config.ts's comment on SUPABASE_SERVICE_ROLE_KEY). It was
-- simply never granted table access at all until now, which is a gap, not
-- a safety feature.
--
-- Apply once, in the Supabase SQL editor or via `psql`, after 002_auth.sql.

grant usage on schema public to service_role;
grant select, insert, update, delete on
  farmers, policy_metadata, weather_feed, oracle_sources, claim_explanations,
  app_users, policy_assignments
  to service_role;
