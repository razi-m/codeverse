-- Seed data for the demo scenarios (docs/Schema.md, T2.3). Off-chain,
-- non-authoritative simulation input only (D1) — never a payout record.
--
-- Matches the demo policy created by contracts/scripts/seed.js:
-- region MH-VID-04, RainfallBelow, 20mm threshold, 5mm tolerance.
--
-- period_id is days-since-epoch (docs/Schema.md), same value both feeds
-- must use for the same window — computed here as
-- floor(extract(epoch from now()) / 86400) so every scenario lines up
-- with "today" regardless of when this is run.
--
-- Three scenarios, one region, one period each, two feeds:
--   baseline     — both above 20mm threshold  → no payout (shortfall)
--   drought      — both below 20mm, agreeing  → payout
--   disagreement — feeds diverge beyond 5mm   → consensus fails, no payout
--
-- Re-runnable: on conflict (region_id, source_key, period_id, scenario)
-- do update, so this can be applied repeatedly without duplicate rows.

insert into oracle_sources (source_key, wallet_address, display_name, provider_type, is_active)
values
  ('feed_a', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', 'District Weather Station Network', 'weather_station', true),
  ('feed_b', '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'Regional Satellite Rainfall Estimate', 'satellite', true)
on conflict (source_key) do update set
  wallet_address = excluded.wallet_address,
  display_name = excluded.display_name,
  provider_type = excluded.provider_type,
  is_active = excluded.is_active;

-- wallet_address values above must match the oracleA/oracleB signer
-- addresses used by contracts/scripts/seed.js on a fresh Hardhat node
-- (Hardhat's deterministic accounts #1 and #2). Presentational only —
-- chain registration is what actually grants submit permission (D-none,
-- see docs/Schema.md § oracle_sources).

do $$
declare
  today bigint := floor(extract(epoch from now()) / 86400);
begin
  -- baseline: both feeds report above the 20mm threshold — no payout due.
  insert into weather_feed (region_id, source_key, period_id, observed_value, measurement_type, observed_at, scenario)
  values
    ('MH-VID-04', 'feed_a', today, 34.00, 'rainfall', now(), 'baseline'),
    ('MH-VID-04', 'feed_b', today, 36.00, 'rainfall', now(), 'baseline')
  on conflict (region_id, source_key, period_id, scenario) do update set
    observed_value = excluded.observed_value, observed_at = excluded.observed_at;

  -- drought: both feeds agree, well below threshold — payout fires.
  insert into weather_feed (region_id, source_key, period_id, observed_value, measurement_type, observed_at, scenario)
  values
    ('MH-VID-04', 'feed_a', today, 9.00, 'rainfall', now(), 'drought'),
    ('MH-VID-04', 'feed_b', today, 11.00, 'rainfall', now(), 'drought')
  on conflict (region_id, source_key, period_id, scenario) do update set
    observed_value = excluded.observed_value, observed_at = excluded.observed_at;

  -- disagreement: spread (25mm) exceeds the 5mm tolerance — consensus fails.
  insert into weather_feed (region_id, source_key, period_id, observed_value, measurement_type, observed_at, scenario)
  values
    ('MH-VID-04', 'feed_a', today, 5.00, 'rainfall', now(), 'disagreement'),
    ('MH-VID-04', 'feed_b', today, 30.00, 'rainfall', now(), 'disagreement')
  on conflict (region_id, source_key, period_id, scenario) do update set
    observed_value = excluded.observed_value, observed_at = excluded.observed_at;
end $$;
