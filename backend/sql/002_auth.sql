-- KisanShield auth/authorization schema (additive to schema.sql).
-- Apply once, in the Supabase SQL editor or via `psql`, after schema.sql.
--
-- Unlike every table in schema.sql (D20: permissive anon policy because
-- service_role wasn't available), the two new tables here are the actual
-- authorization boundary and cannot follow that model. They carry NO
-- anon policy at all — reachable only via the backend's service-role
-- client (see backend/src/services/supabaseAdmin.ts). This is a narrow,
-- deliberate exception: every other table keeps using the anon client
-- exactly as before.

-- Links a farmers row to the Supabase Auth user created on first OTP
-- login. Nullable: a farmers row can exist (seeded by an insurer) before
-- the farmer ever logs in.
alter table farmers add column if not exists auth_user_id uuid unique references auth.users(id);

-- Role lives here, not in Supabase JWT app_metadata/custom claims — a
-- normal server-side table the backend already knows how to query,
-- rather than requiring a custom-access-token Auth Hook.
create table if not exists app_users (
  auth_user_id uuid primary key references auth.users(id),
  role text not null check (role in ('farmer', 'insurer', 'admin')),
  created_at timestamptz not null default now()
);

-- The missing link: which on-chain policyId belongs to which farmer.
-- policy_id is a soft reference to the chain (same convention as
-- policy_metadata in schema.sql) — Postgres cannot FK into chain state.
create table if not exists policy_assignments (
  id uuid primary key default gen_random_uuid(),
  policy_id bigint not null,
  farmer_id uuid not null references farmers(id) on delete cascade,
  assigned_by text not null, -- free text: wallet address or 'manual-demo-seed'
  created_at timestamptz not null default now(),
  unique (policy_id, farmer_id)
);
create index if not exists idx_policy_assignments_policy on policy_assignments (policy_id);
create index if not exists idx_policy_assignments_farmer on policy_assignments (farmer_id);

alter table app_users enable row level security;
alter table policy_assignments enable row level security;

-- Deliberately no policies created for anon/authenticated roles here —
-- deny-by-default. Only the service_role key (which bypasses RLS
-- entirely) can read/write these two tables.
