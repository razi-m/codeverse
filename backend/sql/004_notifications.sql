-- WhatsApp opt-in + notification tracking/idempotency (additive to
-- schema.sql and 002_auth.sql). Apply once, after 003_grants.sql.

-- whatsapp_number is deliberately separate from phone (the Supabase Auth
-- login number) — a farmer may want alerts on a different number than
-- the one they log in with. Both stay off-chain (D12); neither is ever
-- written to the smart contract.
alter table farmers add column if not exists whatsapp_number text check (whatsapp_number ~ '^\+[1-9][0-9]{7,14}$');
alter table farmers add column if not exists whatsapp_opt_in boolean not null default false;

-- Tracks every notification attempt across every channel. event_identifier
-- is the deterministic dedup key (chainId + contractAddress + txHash +
-- logIndex, computed by the caller) — the unique constraint below is what
-- makes idempotency actually enforceable at the database level, surviving
-- backend restarts (a single-process in-memory set would not).
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  event_identifier text not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'voice')),
  policy_id bigint not null,
  farmer_id uuid references farmers(id) on delete set null,
  status text not null check (status in ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING', 'SKIPPED')),
  provider_message_id text,
  attempt_count int not null default 0,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_identifier, channel)
);
create index if not exists idx_notifications_policy on notifications (policy_id);
create index if not exists idx_notifications_event on notifications (event_identifier);

create trigger trg_notifications_updated_at
  before update on notifications
  for each row execute function set_updated_at();

alter table notifications enable row level security;

-- Deny-by-default, same as app_users/policy_assignments (002_auth.sql) —
-- notification records are operational data reachable only via the
-- backend's service-role client, never the browser directly.

-- Learned the hard way in 003_grants.sql: Postgres checks table-level
-- GRANTs before RLS is even evaluated, and service_role gets nothing by
-- default. Grant it here up front instead of needing a follow-up fix.
grant select, insert, update, delete on notifications to service_role;

