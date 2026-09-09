-- KisanShield off-chain schema (docs/Schema.md § Off-Chain Data Model).
-- Postgres/Supabase, reached only from the Express backend.
--
-- DEVIATION FROM Schema.md, recorded as D20 (2026-09-09, user instruction):
-- Schema.md specifies RLS with NO anonymous policy, accessed only via the
-- service_role key. This build uses the anon key instead (service_role was
-- not available), so each table below carries a permissive anon policy.
-- The SEC8 guarantee this weakens is narrower than it sounds: the browser
-- STILL never receives any Supabase key — the anon key lives only in
-- backend/.env, exactly where service_role would have lived. What changes
-- is that the anon key, if it ever leaked (e.g. committed by mistake),
-- would grant read/write on these tables to anyone, where service_role
-- leaking would be no better or worse. Acceptable for a hackathon demo on
-- non-authoritative data (D1) with no real farmer PII; revisit before any
-- non-demo use — swap in the service_role key and drop these policies.
--
-- Non-authoritative by design (D1): every fact here that also has an
-- on-chain counterpart defers to the chain. Dropping this schema must
-- never change a payout or lose a decision record — only presentation.
--
-- Apply once, in the Supabase SQL editor or via `psql`.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- Shared trigger: maintains updated_at on every table below.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- farmers — PII, deliberately off-chain (D12). Joined to on-chain
-- Policy.farmer via wallet_address.
-- ---------------------------------------------------------------------
create table if not exists farmers (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text check (phone ~ '^[0-9]{10}$'),
  village text,
  district text,
  state text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'hi', 'mr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_farmers_wallet on farmers (wallet_address);

create trigger trg_farmers_updated_at
  before update on farmers
  for each row execute function set_updated_at();

alter table farmers enable row level security;

-- D20: permissive anon policy (service_role not available this session).
create policy farmers_anon_all on farmers
  for all
  to anon
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- policy_metadata — presentational detail with no bearing on any
-- decision. policy_id is a soft reference to the chain, not a real FK
-- (Postgres cannot reference chain state).
-- ---------------------------------------------------------------------
create table if not exists policy_metadata (
  id uuid primary key default gen_random_uuid(),
  policy_id bigint not null unique,
  region_display_name text,
  plot_description text,
  area_acres numeric(6, 2) check (area_acres > 0),
  sowing_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_policy_metadata_policy_id on policy_metadata (policy_id);

create trigger trg_policy_metadata_updated_at
  before update on policy_metadata
  for each row execute function set_updated_at();

alter table policy_metadata enable row level security;

-- D20: permissive anon policy (service_role not available this session).
create policy policy_metadata_anon_all on policy_metadata
  for all
  to anon
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- weather_feed — the mock dataset the oracle harness reads. Simulation
-- input only, never a payout record; chain readings are authoritative
-- for what was actually submitted. observed_value is real units (mm);
-- the harness scales x100 at submission, one boundary only.
-- ---------------------------------------------------------------------
create table if not exists weather_feed (
  id uuid primary key default gen_random_uuid(),
  region_id text not null,
  source_key text not null check (source_key in ('feed_a', 'feed_b')),
  period_id bigint not null,
  observed_value numeric(10, 2) not null check (observed_value >= 0),
  measurement_type text not null check (measurement_type in ('rainfall', 'ndvi')),
  observed_at timestamptz not null,
  scenario text not null default 'baseline' check (scenario in ('baseline', 'drought', 'disagreement')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_id, source_key, period_id, scenario)
);
create index if not exists idx_weather_region_period on weather_feed (region_id, period_id);

create trigger trg_weather_feed_updated_at
  before update on weather_feed
  for each row execute function set_updated_at();

alter table weather_feed enable row level security;

-- D20: permissive anon policy (service_role not available this session).
create policy weather_feed_anon_all on weather_feed
  for all
  to anon
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- oracle_sources — display names for oracle addresses. Chain
-- registration is authoritative for permission; is_active here is
-- presentational only — a deregistered oracle cannot submit regardless
-- of this flag.
-- ---------------------------------------------------------------------
create table if not exists oracle_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  wallet_address text not null unique check (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  display_name text not null,
  provider_type text check (provider_type in ('weather_station', 'satellite', 'simulated')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_oracle_sources_updated_at
  before update on oracle_sources
  for each row execute function set_updated_at();

alter table oracle_sources enable row level security;

-- D20: permissive anon policy (service_role not available this session).
create policy oracle_sources_anon_all on oracle_sources
  for all
  to anon
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- claim_explanations — cache of rendered plain-language text. Fully
-- regenerable from chain events; safe to truncate at any time.
-- tx_hash binds a rendering to the exact transaction it describes, so
-- it can never drift from the event it explains.
-- ---------------------------------------------------------------------
create table if not exists claim_explanations (
  id uuid primary key default gen_random_uuid(),
  policy_id bigint not null,
  period_id bigint,
  event_type text not null,
  tx_hash text check (tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  block_number bigint,
  language text not null default 'en',
  explanation_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (policy_id, tx_hash, language)
);
create index if not exists idx_claim_expl_policy on claim_explanations (policy_id, created_at desc);

create trigger trg_claim_explanations_updated_at
  before update on claim_explanations
  for each row execute function set_updated_at();

alter table claim_explanations enable row level security;

-- D20: permissive anon policy (service_role not available this session).
create policy claim_explanations_anon_all on claim_explanations
  for all
  to anon
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- D20 continued: RLS policies only take effect once the role also holds
-- the underlying table privilege — Postgres checks GRANTs first. Without
-- this, `anon` gets "permission denied" regardless of the policies above.
-- ---------------------------------------------------------------------
grant usage on schema public to anon;
grant select, insert, update, delete on
  farmers, policy_metadata, weather_feed, oracle_sources, claim_explanations
  to anon;
