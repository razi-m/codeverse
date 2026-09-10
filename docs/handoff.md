# Handoff — KisanShield (PS3, parametric crop insurance) — 2026-09-10

## Goal

Build **KisanShield** for hackathon problem statement PS3: parametric crop
insurance where an objective weather trigger, not a manual loss survey,
decides payout — and the farmer can see *why* they were or were not paid.

Two differentiators carry the pitch:

1. **Multi-oracle consensus** — two independent weather feeds must agree
   within a tolerance before any payout.
2. **Plain-language claim ledger** — a public, wallet-free page where a
   farmer looks up a policy ID and reads what happened in words, not
   jargon.

All 8 original phases (contract → oracle → backend → farmer UI → insurer
console) were completed and committed before this session. This session
added two large feature tracks on top of that base: (1) a P9 backlog of
live-data adapters, and (2) a full authentication/authorization/
notification layer that was not part of the original scope.

## Current state

- Branch: `master`, last commit: `634748a` "P8: insurer console and polish
  -- M4 reached, all 8 phases complete (T4.1-T4.13)"
- Working tree: **dirty** — 36 modified files, ~60 new untracked files
  (auth middleware/routes, notification services, SQL migrations, new
  frontend pages/components). Nothing has been committed since `634748a`;
  all work below is uncommitted.
- Backend typecheck: verified clean this session (`npm run typecheck
  --workspace @global/backend`).
- Frontend typecheck: verified clean this session (`npm run typecheck
  --workspace @global/frontend`).
- Backend test suite: verified this session — `cd backend && npm test` →
  **90 tests, 86 pass, 0 fail, 4 skipped** (skips are the
  Twilio-not-configured-path tests, correctly skipping because real
  Twilio credentials ARE present in this environment).
- Both dev servers running throughout this session: backend on `:4000`,
  frontend (Vite) on `:5173`.
- **Real, verified-live integrations** (not simulated):
  - Supabase phone-OTP login — a real OTP was sent and verified against
    `+919848011236` this session.
  - Live `PayoutTriggered` event listener (`payoutListener.ts`) — running
    against the local Hardhat deployment, confirmed catching the existing
    policy-1 payout event on backend boot.
  - Twilio WhatsApp send — a real "Send test WhatsApp message" from the
    Admin console's new Notifications tab was delivered to
    `+916005529862` via the Twilio Sandbox. Confirmed by the user
    ("succeeds").
  - `notifications` table insert/read/delete round-trip — verified
    directly against Supabase after fixing a schema-cache issue (see
    Failed attempts).
- **Not yet exercised end-to-end**: no real farmer is currently assigned
  (via `policy_assignments`) to on-chain policy 1, so a real payout has
  never actually triggered a real WhatsApp send through the full
  `payoutListener → notifyPayout` path — only the manual
  `POST /api/notifications/test-whatsapp` path has been proven live.
- SMS fallback code path exists (`notificationRouter.ts`) but is
  **untested** — `TWILIO_SMS_FROM` was deliberately left blank by the
  user, so `isSmsConfigured()` is false and that branch has never run.
- Voice / multilingual voice (original spec phases 16–20) — **not
  started**, out of scope for this session.
- Sepolia: a real small transaction sequence (register oracles, create/
  fund a policy, submit readings, evaluate → payout) was run and verified
  earlier this session against the real deployed contract
  `0xF638B0dA1382b4d941198631280086426Aca423d` on Sepolia. **Known
  unresolved issue, unchanged since before this session's auth/
  notification work**: `deployment.json` is a single shared file that
  gets overwritten by whichever network (local vs Sepolia) was deployed
  to last — it currently points at the **local** chain (31337), not
  Sepolia, so the running frontend/backend read local data only.

## Files actively being edited

Nothing is mid-edit — all changes described below are complete and
typecheck-clean. The tree is dirty only because none of it has been
committed yet.

Major new pieces, by area:

- **Auth/authorization (backend)**: `backend/src/middleware/auth.ts`
  (session verification + `requireRole`), `backend/src/services/
  supabaseAdmin.ts` (service-role client, deliberately separate from the
  anon-key client in `services/supabase.ts`), `backend/src/services/
  policyAuthorization.ts`, `backend/src/routes/authRoutes.ts`
  (link-farmer, me), `backend/src/routes/adminPolicyAssignments.ts`,
  `backend/src/routes/farmerPreferences.ts` (WhatsApp opt-in). `routes/
  policies.ts` now requires auth and checks ownership via
  `policy_assignments` before returning a policy.
- **Notifications (backend)**: `backend/src/services/twilio.ts` (thin
  wrapper, never fabricates delivery status), `backend/src/services/
  notificationRouter.ts` (idempotency via `event_identifier` unique
  constraint, WhatsApp→SMS fallback, bounded retries), `backend/src/
  services/payoutListener.ts` (live `contract.on("PayoutTriggered", ...)`
  subscription, started from `index.ts` on boot), `backend/src/routes/
  notifications.ts` (`GET /health`, `POST /test-whatsapp` — insurer/admin
  only, fixed recipient only).
- **SQL migrations** (NOT auto-applied — each was hand-run by the user in
  the Supabase SQL editor this session): `backend/sql/002_auth.sql`
  (`farmers.auth_user_id`, `app_users`, `policy_assignments`),
  `backend/sql/003_grants.sql` (fixes a real gap — `schema.sql` never
  granted `service_role` any table privileges, so every service-role
  query 403'd until this ran), `backend/sql/004_notifications.sql`
  (`farmers.whatsapp_number`/`whatsapp_opt_in`, `notifications` table).
  `backend/sql/demo-assignments.sql` also exists but has **not** been run
  — it's the template for linking a real farmer login to policy 1.
- **Frontend auth**: `frontend/src/lib/supabaseClient.ts`, `frontend/src/
  lib/AuthContext.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/
  components/shared/RequireFarmerSession.tsx`, `frontend/src/components/
  insurer/RequireInsurerSession.tsx`. `frontend/.env` now holds real
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (not tracked by git).
- **Frontend notifications UI**: `frontend/src/components/farmer/
  WhatsappOptIn.tsx` (added to `PolicyView.tsx`), `frontend/src/
  components/insurer/NotificationPanel.tsx` (new "Notifications" tab in
  `Admin.tsx` — deliberately placed outside `AdminGate`'s wallet-owner
  check, since it's Supabase-RBAC-gated only and never touches the
  contract).
- **Unrelated carryover from earlier in this session** (P9 backlog, done
  before the auth/notification work started): Open-Meteo live weather
  adapter, Sentinel-2 NDVI adapter, Sarvam translation, and the frontend
  visual redesign (palette now light olive per the user's latest
  instruction, replacing an earlier blue). All typecheck-clean and
  tested; see git diff for full file list.
- `backend/.env` now also holds real `SUPABASE_SERVICE_ROLE_KEY`,
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`,
  `NOTIFICATION_TEST_RECIPIENT` (not tracked by git). `TWILIO_SMS_FROM`
  is present but left blank.

## Failed attempts

- **Oracle wallet mismatch (fixed)**: `ORACLE_A_KEY`/`ORACLE_B_KEY` in
  `backend/.env` hold the real Sepolia oracle keys, but `oracleHarness.ts`
  was reading them unconditionally regardless of `BLOCKCHAIN_NETWORK`,
  so local-chain oracle simulation was signing with addresses the local
  contract never registered — every `submitReading` reverted. Fixed by
  gating the env-var override to `config.blockchainNetwork !== "local"`.
  Verified working afterward with a real local drought-scenario run.
- **`service_role` had zero table grants (fixed via `003_grants.sql`)**:
  the original `schema.sql` only ran `grant ... to anon`, never
  `to service_role`. Every service-role query 403'd with
  `permission denied for table X` until `003_grants.sql` was run. This
  affected ALL tables, not just the new auth ones — caught by an
  end-to-end read-only verification script, not by inspection.
- **`notifications` table appeared to exist but didn't (twice)**: after
  the first partial run of `004_notifications.sql`, a `head: true`
  count-only Supabase query reported the `notifications` table as
  reachable with `row count = null` — this was a false positive. A real
  `.insert()` call revealed the true state: `PGRST205 — Could not find
  the table 'public.notifications' in the schema cache`. Root cause
  confirmed via `SELECT table_name FROM information_schema.tables WHERE
  table_schema = 'public'` run by the user directly in the SQL editor:
  the table genuinely did not exist — an earlier partial paste of the
  migration had only applied the `alter table farmers` lines, not the
  `create table notifications` block. Fixed by re-running the missing
  portion of `004_notifications.sql`; confirmed for real this time with
  an insert → read → delete round trip (not just a head-count query).
  **Lesson recorded for next time**: a Supabase `head: true`/count-only
  query is not a reliable existence check — always confirm a table with
  a real row-returning operation (insert or a non-head select).
- **`TWILIO_WHATSAPP_FROM` / `NOTIFICATION_TEST_RECIPIENT` initially
  included a redundant `whatsapp:` prefix** (user pasted values like
  `whatsapp:+14155238886`), which would have produced
  `whatsapp:whatsapp:+...` since `services/twilio.ts` already prepends
  that prefix itself. Caught before any send was attempted; fixed by
  stripping the prefix from both `.env` values.
- **`VITE_SUPABASE_URL` initially pasted as a dashboard settings page
  URL** (`https://<ref>/settings/api-keys`) rather than the actual API
  host (`https://<ref>.supabase.co`). Caught and corrected before first
  use.

## Next step

The immediate next step (proposed to the user, not yet started) is to run
`backend/sql/demo-assignments.sql` to link the user's already-verified
farmer login to on-chain policy 1 via `policy_assignments`, then trigger
a fresh real payout (e.g. via the existing `POST /api/oracles/simulate`
drought scenario) to prove the **full** automatic path — live
`PayoutTriggered` event → `notificationRouter` → real WhatsApp message —
rather than only the manual test-button path already proven.

Beyond that, still open from the original spec and explicitly
out-of-scope for this session unless requested:

- SMS fallback: code exists, needs a real `TWILIO_SMS_FROM` number to
  test.
- Voice helpline + multilingual voice (Twilio Voice, Sarvam STT/TTS) —
  not started at all.
- The `deployment.json` local/Sepolia collision (pre-existing, disclosed
  earlier in the project, unrelated to this session's work) — still
  unfixed; currently pointed at local.
- Nothing has been committed to git yet — the user has not asked for a
  commit, and per project convention that should stay an explicit,
  separate request.
