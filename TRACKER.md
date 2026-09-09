# TRACKER — KisanShield

**Single source of truth for project state.**
Parametric Crop Insurance with Automatic Payout (PS3)

> **Mandatory:** update this file after every change. No implementation may occur without updating it.
> See [docs/AgentRules.md](./docs/AgentRules.md) Rule 3 and Rule 14.

| | |
|---|---|
| Last updated | 2026-09-09 |
| Branch | `master` |
| Last commit | P7 — Farmer transparent claim ledger UI (M3) |
| Budget | ~15h, solo developer |

---

## Project Status

**Phase 0, P1, P2, P3, P4, P5, P6, P7 complete. M1, M2, and M3 reached. P7 awaiting review.**

Implementation is divided into **eight coding phases (P1–P8)**, each ending at a review gate. P7 is done and stopped per Rule 16 — P8 does not begin without confirmation.

All eight Phase 0 deliverables exist, have been cross-reviewed, and are approved. No production code has been written or modified. The repository still contains the original `MessageBoard` scaffold at commit `73cd154`, unchanged.

Per [AgentRules.md](./docs/AgentRules.md) Rule 1, implementation may now begin, starting at **T1.1**.

## Current Phase

**P0, P1, P2, P3, P4, P5, P6, P7 — complete. M1, M2, M3 reached.**
**Next: P8 — Insurer console and polish (M4).**

Implementation is structured as **eight coding phases**, each ending at a hard stop for user review ([AgentRules.md](./docs/AgentRules.md) Rule 16). No phase begins without explicit confirmation that the previous one is accepted.

| Phase | Focus | Tasks | Est. | Milestone | Status |
|---|---|---|---|---|---|
| P0 | Planning and documentation | T0.1–T0.9 | 1h | M0 | **Complete** |
| P1 | Contract foundation and policy lifecycle | T1.1–T1.6 | 1.5h | — | **Complete** |
| P2 | Consensus, evaluation and payout | T1.7–T1.12 | 2h | — | **Complete** |
| P3 | Deploy, seed and end-to-end payout | T1.13–T1.15 | 0.5h | M1 | **Complete — M1 reached** |
| P4 | Supabase and data layer | T2.1–T2.5 | 1.5h | — | **Complete** |
| P5 | Oracle harness and scenarios | T2.6–T2.10 | 1h | M2 | **Complete — M2 reached** |
| P6 | Backend explanation and policy API | T3.1–T3.6 | 1.5h | — | **Complete** |
| P7 | Farmer transparent claim ledger UI | T3.7–T3.17 | 2h | M3 | **Complete — M3 reached** |
| P8 | Insurer console and polish | T4.1–T4.13 | 3.5h | M4 | Not started |

| Milestone | Status | Est. cumulative | Reached at |
|---|---|---|---|
| M0 Planning complete | **Complete** | 0h | end of P0 |
| M1 Contract pays out | **Complete** | ~5h | end of P3 |
| M2 Oracle simulation drives it | **Complete** | ~7.5h | end of P5 |
| M3 Farmer can read the ledger | **Complete** | ~11h | end of P7 |
| M4 Demo-ready | Not started | ~14.5h | end of P8 |

## Active Task

**None — P7 complete, M3 reached, stopped for review per Rule 16.** P8 (T4.1–T4.13: insurer console, polish, M4 checkpoint) is next, and will not start without explicit confirmation.

## Completed Tasks

| ID | Description | Completed |
|---|---|---|
| T0.1 | Write PRD (`docs/PRD.md`) | 2026-09-09 |
| T0.2 | Write TRD (`docs/TRD.md`) | 2026-09-09 |
| T0.3 | Write User Flows (`docs/UserFlows.md`) | 2026-09-09 |
| T0.4 | Write Design doc (`docs/Design.md`) | 2026-09-09 |
| T0.5 | Write Schema (`docs/Schema.md`) | 2026-09-09 |
| T0.6 | Write Implementation Plan (`docs/ImplementationPlan.md`) | 2026-09-09 |
| T0.7 | Write Tracker (`TRACKER.md`) | 2026-09-09 |
| T0.8 | Write Agent Rules (`docs/AgentRules.md`) | 2026-09-09 |
| T0.9 | Cross-document consistency review | 2026-09-09 |

## Pending Tasks

Mirrors [ImplementationPlan.md](./docs/ImplementationPlan.md). **Task IDs must match exactly between the two files.**

### P1 — Contract foundation and policy lifecycle (~1.5h)

No money can move at the end of this phase — `evaluatePolicy` does not exist yet.

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T1.1 | Add OpenZeppelin contracts dependency | Must | T0.9 | Complete |
| T1.2 | Delete `MessageBoard.sol` and its test | Must | T1.1 | Complete |
| T1.3 | Create `CropInsurance.sol` — enums, structs, storage, errors, `Ownable` | Must | T1.2 | Complete |
| T1.4 | Implement `createPolicy` | Must | T1.3 | Complete |
| T1.5 | Implement `fundPolicy` escrow | Must | T1.4 | Complete |
| T1.6 | Implement oracle register/deregister | Must | T1.3 | Complete |

### P2 — Consensus, evaluation and payout (~2h)

Every arithmetic decision that can misdirect money. Note **D8** (strictly below) and **D6** (permissionless).

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T1.7 | Implement `submitReading` with duplicate guard | Must | T1.6 | Complete |
| T1.8 | Implement consensus — spread, tolerance, mean | Must | T1.7 | Complete |
| T1.9 | Implement `evaluatePolicy` — all six reject codes, payout | Must | T1.8 | Complete |
| T1.10 | Implement `cancelPolicy` with refund | Should | T1.5 | Complete |
| T1.11 | Implement view functions | Must | T1.9 | Complete |
| T1.12 | Write contract test suite | Must | T1.11 | Complete |

### P3 — Deploy, seed and end-to-end payout — **M1** (~0.5h)

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T1.13 | Update `deploy.js` contract name | Must | T1.3 | Complete |
| T1.14 | Write `seed.js` — oracles, demo policy, funding | Must | T1.13 | Complete |
| T1.15 | **Checkpoint M1** — end-to-end payout verified | Must | T1.14 | **Complete** |

### P4 — Supabase and data layer (~1.5h)

Timeboxed per **TR4** — 45 minutes for T2.1–T2.3, then fall back to the in-memory fixture.

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T2.1 | Add `@supabase/supabase-js`; create project | Must | T1.15 | Complete |
| T2.2 | Apply schema SQL — tables, constraints, indexes, trigger, RLS | Must | T2.1 | Complete |
| T2.3 | Seed `oracle_sources` and `weather_feed`, all three scenarios | Must | T2.2 | Complete |
| T2.4 | Create `services/supabase.ts` with graceful degradation | Must | T2.1 | Complete |
| T2.5 | Replace `chain.ts` with `insurance.ts` | Must | T1.13 | Complete |

### P5 — Oracle harness and scenarios — **M2** (~1h)

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T2.6 | Build oracle harness — two signers, scaling | Must | T2.3, T2.5 | Complete |
| T2.6a | Data-source adapter interface — `WeatherSource.fetchReading()`, Supabase as default impl, so IMD/Sentinel can swap in later without touching the contract or notification pipeline (user instruction, 2026-09-09) | Must | T2.6 | Complete |
| T2.7 | Add `POST /api/oracle/simulate` | Must | T2.6a | Complete |
| T2.8 | Extend `GET /api/health` | Should | T2.4 | Complete |
| T2.9 | Add `GET /api/oracles` | Should | T2.5 | Complete |
| T2.10 | **Checkpoint M2** — all scenarios; Supabase-down verified | Must | T2.7 | Complete |

### P6 — Backend explanation and policy API (~1.5h)

`explain.ts` is built and unit-tested before any interface exists to render it.

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T3.1 | Create `services/explain.ts` | Must | T2.5 | Complete |
| T3.2 | Unit-test `explain.ts` — all six reject codes | Must | T3.1 | Complete |
| T3.3 | Replace `routes/posts.ts` with `policies.ts` | Must | T2.5 | Complete |
| T3.4 | Add `GET /api/policies/:id/ledger` | Must | T3.1, T3.3 | Complete |
| T3.5 | Add `GET /api/policies/:id/verify` | Should | T3.3 | Complete |
| T3.6 | Update `index.ts` route mounting | Must | T3.3 | Complete |

### P7 — Farmer transparent claim ledger UI — **M3** (~2h)

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T3.7 | Add router; convert `App.tsx` to route shell | Must | T2.10 | Complete |
| T3.8 | Delete post components; update `api.ts`/`contract.ts` | Must | T3.7 | Complete |
| T3.9 | Build design tokens, light and dark | Must | T3.7 | Complete |
| T3.10 | Build shared components incl. `Money`, `Measurement` | Must | T3.9 | Complete |
| T3.11 | Build `StatusBanner` — seven states | Must | T3.10 | Complete |
| T3.12 | Build `PolicyTermsCard`, `ThresholdMeter` | Must | T3.10 | Complete |
| T3.13 | Build `ClaimLedger`, `LedgerEntry` | Must | T3.10, T3.4 | Complete |
| T3.14 | Build `VerifyPanel`, `HowThisWorks` | Should | T3.13 | Complete |
| T3.15 | Build `/policy/:id` and `/` landing | Must | T3.11, T3.12, T3.13 | Complete |
| T3.16 | Route code splitting — verify no wagmi on farmer bundle | Must | T3.15 | Complete |
| T3.17 | **Checkpoint M3** — renders with no wallet extension | Must | T3.16 | Complete |

### P8 — Insurer console and polish — **M4** (~3.5h)

Everything except the gate tasks is Should or Could — the cut buffer (**TR8**).

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T4.1 | Build `AdminGate` | Must | T3.17 | Not started |
| T4.2 | Build `PolicyTable` with unfunded flagging | Must | T4.1 | Not started |
| T4.3 | Build `CreatePolicyForm` | Should | T4.1 | Not started |
| T4.4 | Build `FundPolicyAction` | Should | T4.3 | Not started |
| T4.5 | Build `OracleRegistry`, liveness badge, blocking banner | Must | T4.1 | Not started |
| T4.6 | Build `TxStatus` | Should | T4.3 | Not started |
| T4.7 | Farmer error states with retry | Must | T3.15 | Not started |
| T4.8 | Skeleton loaders | Should | T3.10 | Not started |
| T4.9 | Accessibility audit | Must | T4.7 | Not started |
| T4.10 | Plain-language audit | Must | T4.7 | Not started |
| T4.11 | 15s auto-refresh on active policies | Could | T3.15 | Not started |
| T4.12 | Update root `README.md` | Must | T4.10 | Not started |
| T4.13 | **Checkpoint M4** — full demo script cold start | Must | T4.12 | Not started |

### P9 — Post-MVP backlog (not scheduled)

Recorded, not scheduled. Per user instruction (2026-09-09): build the MVP through P8 first; these are architecture notes for features still being researched, not tasks to implement now. **Do not start before P8 is reviewed and accepted.** No task IDs assigned. Full detail: [ImplementationPlan.md § P9](./docs/ImplementationPlan.md#p9--post-mvp-backlog-not-scheduled-not-estimated).

Candidates: explainable claim view ("why was I paid/rejected"), multi-language explanations (Hindi/Marathi/Telugu), notification router (WhatsApp → voice → SMS fallback), Twilio-backed SMS/voice behind a demo-mode adapter, payout→notification event flow off `PayoutTriggered`, on-chain `NotificationSent` audit event.

Binding constraints when this is eventually scheduled: same EVM/Solidity/Hardhat/ethers stack, no Hyperledger Fabric or chain change; copy still routes through `explain.ts`; no wagmi on farmer routes; on-chain audit data stays minimal (PII off-chain, **D12**); demo mode needs zero external credentials; explanations stay deterministic over structured data, never free-generated.

## Blockers

**None.**

Watch items, not yet blocking:

| Item | Affects | Note |
|---|---|---|
| Supabase project not yet created | T2.1 | Timeboxed to 45 min at TR4; in-memory fixture fallback defined |
| No Supabase account credentials in the repo | T2.1 | `.env.example` only; real keys must never be committed |

## Decisions Made

### Locked in Phase 0

| # | Decision | Rationale |
|---|---|---|
| D1 | **Supabase (Postgres) as off-chain store** | Confirmed by user. Does not exist yet — new construction. Strictly non-authoritative: dropping it must not change any payout or lose any decision record |
| D2 | **Multi-oracle consensus is a core feature, not a nice-to-have** | Confirmed by user. It is the answer to "why not just a database". Two independent feeds must agree within tolerance before any payout. First on the cut list only if the demo would otherwise not run |
| D3 | **Farmer access is public lookup by policy ID** | Confirmed by user. No wallet, no login, no install. Enforced structurally — the farmer route does not import wagmi |
| D4 | **Docs-only session; no code before approval** | Confirmed by user, per `docs/phase0.md` and Rule 1 |

### Architectural decisions

| # | Decision | Rationale |
|---|---|---|
| D5 | `MessageBoard.sol` is **deleted, not refactored** | Zero domain overlap — no access control, no roles, no escrow, no oracle interface. Only infrastructure is inherited |
| D6 | `evaluatePolicy` is **permissionless** | A privileged evaluator could suppress a payout by never calling, recreating the discretionary gate the system exists to remove |
| D7 | Measurements are `uint256` **scaled ×100** | Solidity has no floats. One uniform scale across threshold, tolerance, and reading values makes the mismatched-scale bug class impossible at the comparison site |
| D8 | Trigger is **strictly below** threshold | Equal-to-threshold does not pay. Fixed by an explicit test — the ambiguity is worth one farmer's payout |
| D9 | Status set to `PaidOut` **before** transfer | Checks-effects-interactions; closes the reentrancy path |
| D10 | Evaluation failures **emit `PayoutRejected`, never revert** | A revert leaves no record. The farmer's right to an explained non-payout is a core requirement |
| D11 | History lives in **events, not storage** | Cheaper, immutable, queryable by indexed `policyId`. The ledger is reconstructible from logs alone |
| D12 | Farmer PII stays **off-chain** | On-chain data is permanently public and irremovable. The chain holds an address and an opaque region code |
| D13 | Deploy artifact pattern **retained from scaffold** | `deploy.js` writing `deployment.json` to both backend and frontend keeps address and ABI in sync across workspaces automatically |
| D14 | Split data path **retained**: reads via backend, writes via wagmi | Already gives the farmer a wallet-free read path with no additional work |
| D15 | OpenZeppelin `Ownable` rather than hand-rolled | Audited and minimal; hand-rolling access control is needless risk given no prior blockchain expertise |
| D16 | **Local Hardhat node only** for the demo | No network dependency, no faucet, no gas, fully reproducible from cold start |
| D17 | All farmer-facing strings originate in `explain.ts` | Gives the plain-language audit exactly one target file |
| D18 | **No celebratory animation on payout** | A payout means a crop failed. The moment gets clarity and dignity, not confetti |
| D19 | `evaluatePolicy` converts `periodId` (days-since-epoch) to seconds — `periodId * 1 days` — before comparing against `startDate`/`endDate` (Unix seconds) | Caught before compile in P2: comparing the two directly would have been exactly the scale-mismatch bug class D7/TR3 exists to prevent. Schema.md defines `periodId` as days-since-epoch but `startDate`/`endDate` as Unix seconds — the two were never given a common unit until now |
| D20 | Supabase accessed via the **anon key with a permissive per-table policy**, not `service_role` with no anonymous policy as Schema.md specifies | User instruction (2026-09-09): `service_role` key not available this session. What's preserved: the browser still never receives any Supabase key — the anon key lives only in `backend/.env`, exactly where `service_role` would have. What's weakened: if the anon key leaked, it would grant read/write on these tables, where a leaked `service_role` key would be no worse. Acceptable for a hackathon demo on non-authoritative (D1) data with no real farmer PII; revisit — swap to `service_role`, drop the policies — before any non-demo use. Documented at the top of `backend/sql/schema.sql` |
| D21 | Oracle harness wallets are **long-lived module-level instances**, one per oracle index, and the two feed submissions run **sequentially, never `Promise.all`** | Found during P5 verification: re-instantiating `ethers.Wallet` per call and submitting concurrently caused a real "nonce has already been used" failure — evaluation reused the feed_a wallet right after a concurrent submission from that same wallet raced its own pending-nonce read. Fixed by caching one `Wallet` per address and awaiting each chain-writing call in turn |
| D22 | `explain.ts`'s ETH→₹ conversion is a **named constant, 1 ETH = ₹1,000** | Neither Schema.md nor TRD state this explicitly, but Design.md's own worked example (`25000000000000000000 wei` → `₹25,000`, i.e. 25 ETH → ₹25,000) implies exactly this rate. Made explicit as `ETH_TO_RUPEES = 1_000` with a comment citing that example, rather than left implicit or guessed differently (e.g. 1:1, which is what a naive first pass produced and which a live ledger check caught as wrong) |
| D23 | `PolicyEvent` (and `LedgerEntry`) carry an explicit `blockTimestamp`/`timestamp` field, fetched once per unique block in `getPolicyEvents` | Not every contract event carries its own timestamp in its args (`PayoutTriggered` does not) — only `blockNumber` is universal. A first draft of `summarize()` passed `blockNumber` to a date formatter expecting Unix seconds, which would have rendered nonsense dates. Caught before the fix was ever exercised against live data, by re-reading the function before running it |
| D24 | `main.tsx` holds **no** `WagmiProvider`/`RainbowKitProvider` — those wrap only `pages/Admin.tsx`, itself loaded via `React.lazy()` from `App.tsx` | The scaffold's original `main.tsx` wrapped the entire app in wagmi/RainbowKit at the root — if routes had been added under that unchanged, wagmi would load on `/policy/:id` too, breaking D3 structurally rather than by convention. Restructuring the provider boundary to route-scope, not just adding a router, is what T3.16 actually required |
| D25 | `ThresholdMeter`'s "current reading" is derived client-side from the `/verify` endpoint's raw `ConsensusReached` event args, unscaled by the same ÷100 rule as the backend, rather than a new dedicated endpoint | No backend route currently exposes "the latest reading for the active period" directly — adding one mid-P7 would have expanded P6's already-closed scope. The `/verify` payload already carries this data for the Verify panel, so the meter reuses it rather than duplicating a fetch. Revisit if verify's raw-event shape changes |
| D26 | `explain.ts`'s ETH→₹ rate (`ETH_TO_RUPEES = 1_000`, D22) is duplicated as a literal in `PolicyTermsCard.tsx` for `coverageAmount` | The frontend receives `coverageAmount` as a formatted-ether string from `insurance.ts`, not pre-converted to rupees by `explain.ts` (which only touches event args, not the `Policy` struct itself) — so the terms card must apply the same rate itself. A shared constant would be cleaner; flagged as minor follow-up cleanup rather than blocking the phase, since both numbers are correct and match |

### Gaps found during T0.9 review, and their resolutions

| Gap | Resolution |
|---|---|
| `periodId` semantics were unspecified — two feeds could submit for the same window under different identifiers, making agreement meaningless | Defined in Schema.md as days since epoch of the window start, derived identically by both feeds from the `weather_feed` row |
| Whether a value exactly equal to the threshold pays was ambiguous across documents | Fixed as **strictly below** (D8), stated in TRD, UserFlows E1, and Schema, with a required boundary test at T1.12 |
| Nothing prevented one oracle submitting twice to manufacture agreement with itself | Added the `hasSubmitted` mapping and `DuplicateReading` error; recorded as edge case E3 |
| Reject-reason granularity was insufficient for a plain-language explanation — a single "not triggered" code could not distinguish disagreement from an unmet threshold | Expanded to six distinct reason codes, each with fixed farmer-facing copy |
| "Supabase is non-authoritative" was asserted but not testable | Made operational: the payout path must be verified working with Supabase unreachable, gated at T2.10 |
| The wallet-free guarantee rested on convention and could regress silently | Made structural — route-level code splitting keeps wagmi off the farmer bundle, verified by inspection at T3.16 and in a clean browser profile at T3.17 |

## Files Modified

### P1 — Contract foundation and policy lifecycle

| File | Change |
|---|---|
| `contracts/contracts/CropInsurance.sol` | **Created.** Enums (`TriggerType`, `PolicyStatus`), `Policy`/`Reading` structs, storage (`policies`, `readings`, `hasSubmitted`, oracle registry), custom errors, `Ownable`. `createPolicy`, `fundPolicy`, `cancelPolicy`, `registerOracle`/`deregisterOracle`, view functions. `submitReading`/`evaluatePolicy` deliberately not yet implemented — P2 scope |
| `contracts/contracts/MessageBoard.sol` | **Deleted** — D5 |
| `contracts/test/MessageBoard.test.js` | **Deleted** — no replacement test suite yet; T1.12 (P2) writes the `CropInsurance` suite |
| `contracts/package.json` | Added `@openzeppelin/contracts` dependency |
| `package-lock.json` | Updated by npm install |

Verified by execution: `npx hardhat compile` — clean, 3 files, evm target paris. `npm run typecheck` at root — clean.

### P2 — Consensus, evaluation and payout

| File | Change |
|---|---|
| `contracts/contracts/CropInsurance.sol` | `submitReading` (registered-oracle only, duplicate-per-period guard via `hasSubmitted`); consensus (spread/tolerance/mean); `evaluatePolicy` (permissionless, all six `PayoutRejected` reason codes, strictly-below trigger — D8, status set before transfer — checks-effects-interactions); new events `ReadingSubmitted`, `ConsensusReached`, `ConsensusFailed`, `PayoutTriggered`, `PayoutRejected`; new errors `DuplicateReading`, `PayoutTransferFailed`. Also fixed a unit-scale bug caught before compile — **D19** |
| `contracts/contracts/test/RejectingFarmer.sol` | **Created.** Test-only helper contract that reverts on receive, used for the E6 reentrancy-guard test |
| `contracts/test/CropInsurance.test.js` | **Created.** 23 tests covering every case in TRD §Testing Strategy: policy lifecycle, oracle registration, reading submission, consensus agreement/disagreement/insufficient, trigger met/not-met, the equal-to-threshold boundary (D8), double payout, period bounds, unfunded rejection, permissionless evaluation, and the E6 rejecting-farmer reentrancy case |
| `docs/TRD.md` | Consensus algorithm pseudocode corrected to show the `periodId`-to-seconds conversion (D19) |

Verified by execution: `npx hardhat test` — **23 passing**, 0 failing. `npm test` at root — same, 23 passing. `npm run typecheck` at root — clean.

### P3 — Deploy, seed and end-to-end payout (M1)

| File | Change |
|---|---|
| `contracts/scripts/deploy.js` | Deploys `CropInsurance` instead of `MessageBoard`; writes both `deployment.json` files |
| `contracts/scripts/seed.js` | **Created.** Registers 2 oracles, creates and funds the demo policy (Cotton, MH-VID-04, 20mm threshold, 5mm tolerance, 1 ETH coverage, 30-day window) |
| `contracts/scripts/verify-payout.js` | **Created.** T1.15 checkpoint smoke test — submits two agreeing sub-threshold readings, calls `evaluatePolicy`, asserts farmer balance +1 ETH, `PayoutTriggered` emitted, status `PaidOut`. Kept as a repeatable smoke test, not part of the demo script |

Verified by execution — real local node, real deploy, real seed, real payout, not inferred:

```
npm run chain          → local Hardhat node started (chainId 31337)
npm run deploy          → CropInsurance deployed; both deployment.json written
seed.js                 → 2 oracles registered, policy 1 created and funded (1 ETH)
verify-payout.js        → oracleA submits 9mm, oracleB submits 11mm (mean 10mm < 20mm threshold)
                           evaluatePolicy called → farmer balance +1.0 ETH exactly
                           PayoutTriggered emitted (amount=1.0 ETH, consensusValue=1000)
                           policy.status = 1 (PaidOut)
                         → PASS
npm test (root)         → 23 passing (unaffected)
npm run typecheck        → clean
```

**M1 reached.** This is the first demonstrable product per [ImplementationPlan.md](./docs/ImplementationPlan.md): a funded policy that pays automatically on agreeing sub-threshold readings.

### P4 — Supabase and data layer

| File | Change |
|---|---|
| `backend/package.json` | Added `@supabase/supabase-js` |
| `backend/sql/schema.sql` | **Created.** All five tables (`farmers`, `policy_metadata`, `weather_feed`, `oracle_sources`, `claim_explanations`) per Schema.md, `set_updated_at` trigger, RLS enabled on every table. Deviates from spec — anon key + permissive per-table policies + explicit `GRANT`s instead of `service_role` with no anonymous policy — **D20** |
| `backend/sql/seed.sql` | **Created.** Seeds `oracle_sources` (2 feeds, matching the P3 demo policy's oracle signer addresses) and `weather_feed` with all three scenarios — baseline (34/36mm, above 20mm threshold), drought (9/11mm, below threshold, agreeing), disagreement (5/30mm, spread exceeds 5mm tolerance) — for region `MH-VID-04` |
| `backend/src/services/supabase.ts` | **Created.** Typed client + query functions for all five tables; every query wrapped in `safe()`, degrades to `null` on any failure (missing config, network error, Supabase down) rather than throwing |
| `backend/src/services/insurance.ts` | **Created.** Replaces `chain.ts` for on-chain reads — `getPolicy`, `getPolicyCount`, `listPolicies`, `getReadings`, `isRegisteredOracle`, `getOracleList`, `getChainStatus`; 5s TTL cache retained from `chain.ts` (Rule 6); unscales ×100 values back to real units before leaving the file (D7) |
| `backend/.env` | **Created, gitignored.** `SUPABASE_URL`/`SUPABASE_ANON_KEY` from the user-provided project |
| `backend/.env.example` | Documents the two new vars (no real values) |
| `backend/src/config.ts` | Reads `SUPABASE_URL`/`SUPABASE_ANON_KEY`, both nullable — absence is a valid, handled state |

`routes/posts.ts` and `index.ts` are **not yet rewired** to `insurance.ts`/`supabase.ts` — that's T3.3/T3.6 in P6. They still import `chain.ts` (untouched, still works) so the app keeps building through P4/P5.

**Real bug found and fixed during verification:** the first schema apply left `anon` with RLS policies but no table-level `GRANT` — Postgres checks grants before policies, so every query failed with "permission denied" despite the policies being correct. Fixed by adding explicit `grant select, insert, update, delete ... to anon` after the policies. Caught by actually querying the live database, not by reading the SQL.

Verified by execution — real Supabase project, not mocked:

```
schema.sql applied via pooler connection → all 5 tables created, RLS enabled (confirmed via
                                             information_schema + pg_class query)
seed.sql applied                        → 6 weather_feed rows (3 scenarios × 2 feeds) + 2 oracle_sources,
                                             confirmed via SELECT
insurance.ts smoke test (live chain)    → getPolicy(1) correctly reads back the P3 demo policy:
                                             thresholdValue=20, toleranceValue=5 (unscaled from
                                             chain's 2000/500), status=1 (PaidOut, from the P3 payout),
                                             oracleList=[oracleA, oracleB] — matches seed.js exactly
supabase.ts smoke test (live DB)        → all 3 scenarios readable after the GRANT fix; oracle_sources
                                             readable
supabase.ts degrade test                → pointed at a nonexistent host; getWeatherFeed() returned
                                             null, did not throw — PASS
npm run typecheck (root)                → clean
npm test (root)                         → 23 passing, unaffected
```

Temporary verification scripts (`_p4-smoke-test.ts`, `_p4-degrade-test.ts`) were deleted after use — not part of the committed tree.

**Credential handling:** the Supabase DB password (used once, for the pooler connection to apply DDL) was passed only as a shell environment variable in this session and never written to any file; the one-off `pg` script and its `node_modules` were deleted from the scratchpad after use. The long-lived credential — the anon key — lives only in `backend/.env`, which is gitignored (confirmed via `git check-ignore` before writing it).

### P5 — Oracle harness and scenarios (M2)

| File | Change |
|---|---|
| `backend/src/services/weatherSource.ts` | **Created.** `WeatherSource` interface (T2.6a) — `fetchReading(regionId, periodId, sourceKey)`. The harness depends only on this; nothing downstream knows Supabase, or any specific provider, exists |
| `backend/src/services/supabaseWeatherSource.ts` | **Created.** `SupabaseWeatherSource implements WeatherSource` — the default adapter, scenario-parameterized. A future `ImdRainfallSource`/`SentinelVegetationSource` (P9) implements the same interface, unseen by the harness |
| `backend/src/services/oracleHarness.ts` | **Created.** `submitFromFeed` (one feed, one reading, via a `WeatherSource`) and `runScenario` (both feeds + `evaluatePolicy`). Long-lived per-address wallets derived from Hardhat's well-known local mnemonic (`ORACLE_A_KEY`/`ORACLE_B_KEY` env override for non-local use) |
| `backend/src/routes/oracle.ts` | **Created.** `POST /api/oracles/simulate` (T2.7, body: `policyId`, `scenario`, optional `periodId`) and `GET /api/oracles` (T2.9, optional `?policyId&periodId` for per-reading submission status) |
| `backend/src/index.ts` | `/api/health` extended (T2.8) with `oracles.registeredCount` and `supabase.{configured,reachable}` (a real query, not just presence of config); mounts `oracleRouter` at `/api/oracles` |

**Real bug found and fixed during verification — D21:** the first live test of `/api/oracles/simulate` failed with "nonce has already been used". Root cause: `submitFromFeed` created a fresh `ethers.Wallet` per call and submitted both feeds concurrently (`Promise.all`); `runScenario`'s evaluation step then reused the feed_a address's wallet immediately after, racing that address's own in-flight nonce. Fixed by caching one long-lived `Wallet` instance per oracle address and running the two submissions sequentially rather than in parallel. Confirmed fixed by re-running the failing case.

Verified by execution — real Hardhat node, real deployed contract, real HTTP calls, not mocked:

```
Fresh deploy + seed (policy 1, Active)     → confirmed via /api/health (2 oracles registered)
POST /api/oracles/simulate {policyId:1,
  scenario:"disagreement"}                 → both feeds submitted (5mm, 30mm); evaluation:
                                              on-chain event ConsensusFailed(spread=2500,
                                              tolerance=500), PayoutRejected(reasonCode=3);
                                              policy 1 still Active
2 more policies created (2, 3)
POST .../simulate {policyId:2,"baseline"}  → 34mm/36mm submitted; PayoutRejected(reasonCode=1,
                                              threshold not breached); policy 2 still Active
POST .../simulate {policyId:3,"drought"}   → 9mm/11mm submitted; PayoutTriggered(amount=1.0 ETH);
                                              policy 3 status PaidOut
                                            → all three scenarios independently confirmed via
                                              on-chain event query, not just the HTTP response
T2.10 Supabase-unreachable check:
  SUPABASE_URL pointed at a nonexistent host, backend restarted
  /api/health                              → supabase.reachable:false, chain/oracles unaffected
  POST .../simulate (fresh periodId)       → both feeds report "no reading available" (correct
                                              degrade, no crash); evaluatePolicy still runs and
                                              correctly emits PayoutRejected(reasonCode=2,
                                              insufficient readings) — the payout path is provably
                                              independent of Supabase (D1)
  Supabase config restored, verified via /api/health → reachable:true again
npm run typecheck (root)                   → clean
npm test (root)                            → 23 passing, unaffected
```

**M2 reached.** All three demo scenarios are reproducible on command from a cold start, and the payout path is proven to work with Supabase unreachable — "non-authoritative" is now a tested claim, not an assertion.

### Documentation

| File | Purpose |
|---|---|
| `docs/PRD.md` | Product requirements |
| `docs/TRD.md` | Technical requirements, contract specification |
| `docs/UserFlows.md` | Journeys, decision trees, edge cases |
| `docs/Design.md` | Design system, component inventory |
| `docs/Schema.md` | Canonical data model, on-chain and off-chain |
| `docs/ImplementationPlan.md` | Phased task breakdown |
| `docs/AgentRules.md` | Operating rules |
| `TRACKER.md` | This file |

### P6 — Backend explanation and policy API

| File | Change |
|---|---|
| `backend/src/services/insurance.ts` | Added `getPolicyEvents(policyId)` — queries all 8 policy-scoped events filtered by indexed `policyId`, sorted chronologically, with `blockTimestamp` resolved once per unique block (not once per event) and attached to every `PolicyEvent` — **D23** |
| `backend/src/services/explain.ts` | **Created.** Single source of every farmer-facing string (D17). `buildLedger()` converts a raw event array into plain-language `LedgerEntry[]`; `summarize()` derives the one-line status headline from the same data so it can never disagree with the ledger below it. Banned-vocabulary list from Design.md kept as an in-file comment. `ETH_TO_RUPEES = 1_000` named constant — **D22** |
| `backend/src/services/explain.test.ts` | **Created.** 14 unit tests: all six `PayoutRejected` reason codes, all other event types, an unrecognised-code fallback, ledger ordering, and `summarize()` — every test also asserts against the full Design.md banned-vocabulary list, not just spot-checking |
| `backend/src/routes/policies.ts` | **Created**, replaces `routes/posts.ts`. `GET /api/policies` (paginated, same offset/limit/MAX_LIMIT convention as the retired route), `GET /api/policies/:id`, `GET /api/policies/:id/ledger` (the centrepiece), `GET /api/policies/:id/verify` (raw proof). Region display name resolved from Supabase, degrading to the raw region code — never fails the response |
| `backend/src/index.ts` | Mounts `policiesRouter` at `/api/policies`; `/api/health` now reads `insurance.ts` in place of `chain.ts` |
| `backend/src/routes/posts.ts` | **Deleted** — MessageBoard-era route, no longer referenced anywhere |
| `backend/src/services/chain.ts` | **Deleted** — MessageBoard-era service, fully superseded by `insurance.ts` (T2.5, P4) |
| `backend/package.json` | Added `test` script — `node --import tsx --test`, no new test-framework dependency |

**Real bug found and fixed during verification — D22:** a live ledger check showed "Paid — ₹1" for a 1 ETH payout. Design.md's own worked example (`25000000000000000000 wei` → `₹25,000`) implies **1 ETH = ₹1,000**, not the 1:1 a first pass had assumed. Fixed with a named constant and re-verified live — the same policy now correctly reads "Paid — ₹1,000".

**Second issue caught before it ran — D23:** `summarize()`'s first draft passed a raw `blockNumber` to a date formatter expecting Unix seconds (not every event, e.g. `PayoutTriggered`, carries its own timestamp in its args). Caught by re-reading the function before executing it, not by a failed test — fixed by resolving and attaching a real `blockTimestamp` to every `PolicyEvent` in `insurance.ts`.

Verified by execution — real deployed contract with real event history (3 policies from P5: disagreement, baseline, drought/paid), not mocked:

```
npm test (backend, explain.ts)          → 14 passing, includes a banned-vocabulary
                                            assertion against every rendered string
GET /api/policies                       → 3 policies, real terms, regionDisplayName
                                            degrading to raw regionId (no metadata seeded)
GET /api/policies/3                     → single funded/paid policy, correct
GET /api/policies/3/ledger              → full 6-entry chronological ledger for the
                                            paid policy, ending "Paid — ₹1,000 reached
                                            you because rainfall was 10mm, below your
                                            20mm threshold" — cites real numbers, zero
                                            banned vocabulary
GET /api/policies/1/ledger              → disagreement policy's ledger correctly reads
                                            "The two weather sources disagreed. No
                                            payout was made on disputed data."
GET /api/policies/3/verify              → raw contract address, block numbers, tx
                                            hashes, event payloads (bigints as strings)
GET /api/policies/999                   → 404 "Policy not found"
GET /api/policies/abc                   → 400 "id must be a positive integer"
GET /api/policies?limit=99999           → capped to 100 (MAX_LIMIT), not unbounded
npm run typecheck (root)                → clean
npm test (root, contracts)              → 23 passing, unaffected
```

### Documentation

| File | Purpose |
|---|---|
| `docs/PRD.md` | Product requirements |
| `docs/TRD.md` | Technical requirements, contract specification |
| `docs/UserFlows.md` | Journeys, decision trees, edge cases |
| `docs/Design.md` | Design system, component inventory |
| `docs/Schema.md` | Canonical data model, on-chain and off-chain |
| `docs/ImplementationPlan.md` | Phased task breakdown |
| `docs/AgentRules.md` | Operating rules |
| `TRACKER.md` | This file |

### P7 — Farmer transparent claim ledger UI (M3)

| File | Change |
|---|---|
| `frontend/src/main.tsx` | **Rewritten.** No `WagmiProvider`/`RainbowKitProvider` at the root — bare `BrowserRouter`. This is the structural fix, not just adding a router — **D24** |
| `frontend/src/App.tsx` | **Rewritten.** Route shell: `/`, `/policy/:id` eager; `/admin` behind `React.lazy()` + `Suspense` |
| `frontend/src/pages/Landing.tsx` | **Created.** `/` — `PolicyLookup` card, link to `/admin` |
| `frontend/src/pages/PolicyView.tsx` | **Created.** `/policy/:id` — fetches policy + ledger + verify in parallel, 15s silent auto-refresh while `Active`, error/loading states |
| `frontend/src/pages/PolicySkeleton.tsx` | **Created.** Sized to the final layout, no layout shift on load |
| `frontend/src/pages/Admin.tsx` | **Created.** Owns `WagmiProvider`/`RainbowKitProvider` locally — the only file in the repo that imports them. Placeholder console shell; full build is P8 |
| `frontend/src/components/farmer/*` | **Created (9 files).** `StatusBanner`, `PolicyTermsCard`, `ThresholdMeter` (with full text-equivalent accessible name), `ClaimLedger`, `LedgerEntry`, `VerifyPanel`, `HowThisWorks`, `PolicyLookup`, `FarmerErrorState` |
| `frontend/src/components/shared/*` | **Created (6 files).** `Card`, `Button`, `Badge` (colour+icon+text, never colour alone), `Skeleton`, `Money`, `Measurement`, `DateDisplay` |
| `frontend/src/styles/tokens.css` | **Created.** Full design-token system from Design.md — light/dark colour, farmer/insurer type scale via `[data-surface]`, spacing, motion, `prefers-reduced-motion` |
| `frontend/src/styles/farmer.css` | **Created.** Component styles for every farmer component, mobile-first at 360px |
| `frontend/src/styles.css` | **Deleted** — superseded by the two files above |
| `frontend/src/lib/api.ts` | **Rewritten.** Domain types (`Policy`, `LedgerEntry`, `PolicyLedger`, `PolicyVerify`, `HealthStatus`) matching P6's actual route responses; same `fetch`/`BASE` pattern retained |
| `frontend/src/components/PostComposer.tsx` | **Deleted** |
| `frontend/src/components/PostList.tsx` | **Deleted** |
| `frontend/package.json` | Added `react-router-dom` |

**Architecture note — D24, the actual T3.16 fix:** the scaffold's original `main.tsx` wrapped the *entire app* in `WagmiProvider`/`RainbowKitProvider` at the root. Adding routes under that unchanged would have loaded wagmi on `/policy/:id` too — breaking the wallet-free guarantee structurally, not just by an oversight. The real fix was moving those providers *into* `Admin.tsx` itself, loaded only via `React.lazy()`. `main.tsx` and `App.tsx` for the farmer path now import zero wallet code, at any depth.

Verified by execution — a real headless Chromium browser (Playwright, no wallet extension installed, exactly the T3.17 requirement by construction) against the real dev server with the real backend and real chain data from P3–P6:

```
Production build                     → succeeds; entry chunk (index-DxTuXAkH.js, 192KB)
                                         grepped for "wagmi"/"RainbowKit"/"MetaMask"/
                                         "WalletConnect" — ZERO matches in JS or CSS.
                                         Only a React.lazy() import() reference exists
/policy/3 (paid, drought scenario)   → full render: green "Paid — ₹1,000" banner, terms
                                         card, threshold meter (bar below the marked
                                         threshold), 6-entry chronological ledger ending
                                         at policy creation — screenshot captured
/policy/1 (disagreement scenario)    → correct render: blue banner citing the true most-
                                         recent outcome, ledger shows the full disagreement
                                         history, meter shows "No reading yet" (correctly —
                                         ConsensusReached never fired for this policy)
/ (landing)                          → PolicyLookup renders; typing "3" and submitting
                                         navigates to /policy/3 correctly (real form
                                         interaction, not just a static render)
/policy/999 (not found)              → FarmerErrorState with retry button, role="alert",
                                         non-technical copy
/admin                                → renders via the lazy chunk; Connect Wallet button
                                         present — confirmed this IS where wagmi/RainbowKit
                                         load, proving the split is real, not accidental
Network trace across all farmer      → zero requests matching wagmi/rainbowkit/
  route visits                         walletconnect/metamask/reown/w3m
Console errors across all visits     → NONE
200% zoom @ 640px viewport           → no horizontal scroll
360px mobile viewport                → no horizontal scroll, full render, single column
ThresholdMeter aria-label            → "Rainfall 10mm, threshold 20mm — below threshold."
                                         (exact format required by Design.md)
StatusBanner attributes              → role="status", aria-live="polite" confirmed present
How this works / Verify this record  → both expand via native <details>, correct content
npm run typecheck (root)             → clean
npm test (root, contracts)           → 23 passing, unaffected
npm test (backend, explain.ts)       → 14 passing, unaffected
```

**M3 reached.** `/policy/:id` renders fully in a browser with no wallet extension — verified, not assumed.

### Documentation

| File | Purpose |
|---|---|
| `docs/PRD.md` | Product requirements |
| `docs/TRD.md` | Technical requirements, contract specification |
| `docs/UserFlows.md` | Journeys, decision trees, edge cases |
| `docs/Design.md` | Design system, component inventory |
| `docs/Schema.md` | Canonical data model, on-chain and off-chain |
| `docs/ImplementationPlan.md` | Phased task breakdown |
| `docs/AgentRules.md` | Operating rules |
| `TRACKER.md` | This file |

### Pre-existing, untouched

`README.md`; `docs/PS3-context-for-claude-code.md`; `docs/phase0.md`; `docs/handoff.md`; `docs/README.md`. `frontend/src/lib/contract.ts` and `frontend/src/lib/wagmi.ts` are reused as-is (Rule 6) — both are generic and needed by P8's admin console.

## Features Implemented

**CF1–CF4, CF5 (backend half), and CF8 complete, verified live end-to-end.** Policy registry, oracle registration/submission, multi-oracle consensus, automatic trigger evaluation and payout, the oracle simulation harness, and — new this phase — the plain-language claim ledger itself, reconstructed live from real chain events with zero banned vocabulary. `MessageBoard`'s last two files (`posts.ts`, `chain.ts`) are gone. The frontend has not been touched — it still imports the old post-board components and will 404 against `/api/posts` until P7 rewires it; that is the correct, scoped state of this checkpoint, not a regression.

## Features Remaining

Against [PRD.md](./docs/PRD.md) core features:

| ID | Feature | Phase | Status |
|---|---|---|---|
| CF1 | On-chain policy registry | P1 | **Complete** |
| CF2 | Registered-oracle data submission | P1–P2 | **Complete** |
| CF3 | Multi-oracle consensus | P2 | **Complete** |
| CF4 | Automatic trigger evaluation and payout | P2–P3 | **Complete — M1 verified live** |
| CF5 | Plain-language claim ledger | P6–P7 | **Complete — M3 verified live in a browser, no wallet extension** |
| CF6 | Wallet-free farmer access | P7 | **Complete — structural (D24), verified by bundle inspection and network trace** |
| CF7 | Insurer admin console | P8 | Route boundary exists (`Admin.tsx`, wallet-scoped) — full console is P8 |
| CF8 | Oracle simulation harness | P5 | **Complete — M2 verified live, all 3 scenarios** |

Every core feature has at least one implementing task — verified during T0.9. **Six of eight core features are now complete**, with only the insurer console (CF7) remaining.

## Bugs Found

| Bug | Found at | Fix |
|---|---|---|
| `evaluatePolicy` compared `periodId` (days-since-epoch) directly against `startDate`/`endDate` (Unix seconds) — a unit-scale mismatch | P2, before compile | Convert `periodId * 1 days` before comparing — **D19** |
| Supabase `anon` role had RLS policies but no table-level `GRANT` — every query returned "permission denied" | P4, during verification (live query against real DB) | Added explicit `grant select, insert, update, delete ... to anon` in `schema.sql`, applied to the live project |
| Oracle harness: fresh `ethers.Wallet` per call + concurrent (`Promise.all`) submissions caused "nonce has already been used" when evaluation reused the feed_a address right after | P5, during first live simulate call | Long-lived per-address wallets + sequential submission — **D21** |
| `explain.ts` rendered a 1 ETH payout as "₹1" — Design.md's own worked example implies 1 ETH = ₹1,000, not 1:1 | P6, during live ledger verification | Named constant `ETH_TO_RUPEES = 1_000` — **D22** |
| `summarize()` passed a raw `blockNumber` to a date formatter expecting Unix seconds | P6, caught by re-reading before executing, not by a failed test | `getPolicyEvents` now resolves and attaches a real `blockTimestamp` to every event — **D23** |

Known scaffold issues carried over from [docs/handoff.md](./docs/handoff.md), for awareness rather than action:

| Issue | Note |
|---|---|
| `npx tsc` resolves to a bogus `tsc@2.0.4` package | Use `./node_modules/.bin/tsc` |
| Stale `backend/src/deployment.json` and `frontend/dist/` reference the old ABI | Overwritten on next deploy — harmless, but a stale-artifact demo failure is TR7 |

Minor debt recorded, not a bug (see D26): the ETH→₹ rate is duplicated as a literal in `PolicyTermsCard.tsx` rather than shared with `explain.ts`'s constant — no cross-workspace shared-code path exists yet. Both numbers are correct and match; fix if a shared package is ever introduced.

## Bugs Fixed

| Bug | Fixed at |
|---|---|
| `periodId`/date unit-scale mismatch in `evaluatePolicy` (see Bugs Found) | P2, before compile — never shipped |
| Supabase `anon` missing `GRANT`s (see Bugs Found) | P4, before this phase was reported complete |
| Oracle harness nonce race (see Bugs Found) | P5, before this phase was reported complete — confirmed fixed by re-running the exact failing call |
| ETH→₹ conversion rate (see Bugs Found) | P6, before this phase was reported complete — confirmed fixed against the live ledger |
| `summarize()` block-number-as-timestamp (see Bugs Found) | P6, before it was ever exercised against live data |

## Next Actions

**P7 is complete, M3 reached, and stopped for review (Rule 16). Awaiting confirmation before P8 begins.**

P8 — Insurer console and polish, **M4 checkpoint** (T4.1–T4.13), no new credentials needed:

1. **T4.1** — `AdminGate`: wallet connect, owner check, read-only fallback (builds on the `Admin.tsx` shell from P7)
2. **T4.2** — `PolicyTable` — dense portfolio view, unfunded-policy flagging
3. **T4.3–T4.4** — `CreatePolicyForm`, `FundPolicyAction` (Should priority — first cuts if time runs short)
4. **T4.5** — `OracleRegistry`, `OracleLivenessBadge`, blocking banner when fewer than two feeds registered
5. **T4.6** — `TxStatus` — pending/confirmed/rejected, form state preserved on rejection
6. **T4.7** — farmer error states with retry (`FarmerErrorState` already built in P7 — this wires it to backend-down and chain-down cases specifically)
7. **T4.8** — skeleton loaders sized to final content across all views
8. **T4.9** — accessibility audit — contrast both themes, keyboard nav, screen reader, 200% zoom, reduced motion (P7 already verified several of these live; this is the systematic pass)
9. **T4.10** — plain-language audit — every farmer-facing string against the banned-vocabulary list (P7's `explain.ts` tests already assert this per-string; this is the full-surface sweep)
10. **T4.11** — 15s auto-refresh on active policies (**already built in P7's `PolicyView.tsx`** — this task is effectively done, will confirm and mark complete)
11. **T4.12** — update root `README.md` — replace MessageBoard references with run instructions and demo script
12. **T4.13 — Checkpoint M4** — full demo script from a cold start, all three scenarios

This is the last phase. Everything in it except the gate tasks is Should/Could (**TR8**) — M3 plus a seeded policy is already demonstrable on its own if P8 runs short.

Before starting, read [docs/AgentRules.md](./docs/AgentRules.md), [docs/TRD.md](./docs/TRD.md) §Contract Specification, and [docs/Schema.md](./docs/Schema.md) — Schema is canonical for every entity and field name.

---

## Related documents

- [PRD](./docs/PRD.md) · [TRD](./docs/TRD.md) · [User Flows](./docs/UserFlows.md) · [Design](./docs/Design.md) · [Schema](./docs/Schema.md) · [Implementation Plan](./docs/ImplementationPlan.md) · [Agent Rules](./docs/AgentRules.md)
