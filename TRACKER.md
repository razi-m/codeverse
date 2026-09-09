# TRACKER — KisanShield

**Single source of truth for project state.**
Parametric Crop Insurance with Automatic Payout (PS3)

> **Mandatory:** update this file after every change. No implementation may occur without updating it.
> See [docs/AgentRules.md](./docs/AgentRules.md) Rule 3 and Rule 14.

| | |
|---|---|
| Last updated | 2026-09-09 |
| Branch | `master` |
| Last commit | P3 — Deploy, seed and end-to-end payout (M1) |
| Budget | ~15h, solo developer |

---

## Project Status

**Phase 0, P1, P2, P3 complete. M1 reached — contract pays out, verified end-to-end on a local node. P3 awaiting review.**

Implementation is divided into **eight coding phases (P1–P8)**, each ending at a review gate. P3 is done and stopped per Rule 16 — P4 does not begin without confirmation, and needs a Supabase URL + anon key from the user first.

All eight Phase 0 deliverables exist, have been cross-reviewed, and are approved. No production code has been written or modified. The repository still contains the original `MessageBoard` scaffold at commit `73cd154`, unchanged.

Per [AgentRules.md](./docs/AgentRules.md) Rule 1, implementation may now begin, starting at **T1.1**.

## Current Phase

**P0, P1, P2, P3 — complete. M1 reached.**
**Next: P4 — Supabase and data layer.**

Implementation is structured as **eight coding phases**, each ending at a hard stop for user review ([AgentRules.md](./docs/AgentRules.md) Rule 16). No phase begins without explicit confirmation that the previous one is accepted.

| Phase | Focus | Tasks | Est. | Milestone | Status |
|---|---|---|---|---|---|
| P0 | Planning and documentation | T0.1–T0.9 | 1h | M0 | **Complete** |
| P1 | Contract foundation and policy lifecycle | T1.1–T1.6 | 1.5h | — | **Complete** |
| P2 | Consensus, evaluation and payout | T1.7–T1.12 | 2h | — | **Complete** |
| P3 | Deploy, seed and end-to-end payout | T1.13–T1.15 | 0.5h | M1 | **Complete — M1 reached, awaiting review** |
| P4 | Supabase and data layer | T2.1–T2.5 | 1.5h | — | Not started |
| P5 | Oracle harness and scenarios | T2.6–T2.10 | 1h | M2 | Not started |
| P6 | Backend explanation and policy API | T3.1–T3.6 | 1.5h | — | Not started |
| P7 | Farmer transparent claim ledger UI | T3.7–T3.17 | 2h | M3 | Not started |
| P8 | Insurer console and polish | T4.1–T4.13 | 3.5h | M4 | Not started |

| Milestone | Status | Est. cumulative | Reached at |
|---|---|---|---|
| M0 Planning complete | **Complete** | 0h | end of P0 |
| M1 Contract pays out | **Complete** | ~5h | end of P3 |
| M2 Oracle simulation drives it | Not started | ~7.5h | end of P5 |
| M3 Farmer can read the ledger | Not started | ~11h | end of P7 |
| M4 Demo-ready | Not started | ~14.5h | end of P8 |

## Active Task

**None — P3 complete, M1 reached, stopped for review per Rule 16.** P4 (T2.1–T2.5: Supabase and data layer) is next, and will not start without explicit confirmation. **P4 needs a Supabase project URL + anon key from the user before it can proceed.**

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
| T2.1 | Add `@supabase/supabase-js`; create project | Must | T1.15 | Not started |
| T2.2 | Apply schema SQL — tables, constraints, indexes, trigger, RLS | Must | T2.1 | Not started |
| T2.3 | Seed `oracle_sources` and `weather_feed`, all three scenarios | Must | T2.2 | Not started |
| T2.4 | Create `services/supabase.ts` with graceful degradation | Must | T2.1 | Not started |
| T2.5 | Replace `chain.ts` with `insurance.ts` | Must | T1.13 | Not started |

### P5 — Oracle harness and scenarios — **M2** (~1h)

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T2.6 | Build oracle harness — two signers, scaling | Must | T2.3, T2.5 | Not started |
| T2.6a | Data-source adapter interface — `WeatherSource.fetchReading()`, Supabase as default impl, so IMD/Sentinel can swap in later without touching the contract or notification pipeline (user instruction, 2026-09-09) | Must | T2.6 | Not started |
| T2.7 | Add `POST /api/oracle/simulate` | Must | T2.6a | Not started |
| T2.8 | Extend `GET /api/health` | Should | T2.4 | Not started |
| T2.9 | Add `GET /api/oracles` | Should | T2.5 | Not started |
| T2.10 | **Checkpoint M2** — all scenarios; Supabase-down verified | Must | T2.7 | Not started |

### P6 — Backend explanation and policy API (~1.5h)

`explain.ts` is built and unit-tested before any interface exists to render it.

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T3.1 | Create `services/explain.ts` | Must | T2.5 | Not started |
| T3.2 | Unit-test `explain.ts` — all six reject codes | Must | T3.1 | Not started |
| T3.3 | Replace `routes/posts.ts` with `policies.ts` | Must | T2.5 | Not started |
| T3.4 | Add `GET /api/policies/:id/ledger` | Must | T3.1, T3.3 | Not started |
| T3.5 | Add `GET /api/policies/:id/verify` | Should | T3.3 | Not started |
| T3.6 | Update `index.ts` route mounting | Must | T3.3 | Not started |

### P7 — Farmer transparent claim ledger UI — **M3** (~2h)

| ID | Description | Priority | Dependency | Status |
|---|---|---|---|---|
| T3.7 | Add router; convert `App.tsx` to route shell | Must | T2.10 | Not started |
| T3.8 | Delete post components; update `api.ts`/`contract.ts` | Must | T3.7 | Not started |
| T3.9 | Build design tokens, light and dark | Must | T3.7 | Not started |
| T3.10 | Build shared components incl. `Money`, `Measurement` | Must | T3.9 | Not started |
| T3.11 | Build `StatusBanner` — seven states | Must | T3.10 | Not started |
| T3.12 | Build `PolicyTermsCard`, `ThresholdMeter` | Must | T3.10 | Not started |
| T3.13 | Build `ClaimLedger`, `LedgerEntry` | Must | T3.10, T3.4 | Not started |
| T3.14 | Build `VerifyPanel`, `HowThisWorks` | Should | T3.13 | Not started |
| T3.15 | Build `/policy/:id` and `/` landing | Must | T3.11, T3.12, T3.13 | Not started |
| T3.16 | Route code splitting — verify no wagmi on farmer bundle | Must | T3.15 | Not started |
| T3.17 | **Checkpoint M3** — renders with no wallet extension | Must | T3.16 | Not started |

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

`backend/`, `frontend/` in full; `README.md`; `docs/PS3-context-for-claude-code.md`; `docs/phase0.md`; `docs/handoff.md`; `docs/README.md`.

## Features Implemented

**CF1–CF4 complete, verified live.** Policy registry, oracle registration/submission, multi-oracle consensus, and automatic trigger evaluation and payout all work end-to-end on a deployed local contract — not just unit-tested. Nothing off-chain (backend/frontend) yet — that starts P4.

## Features Remaining

Against [PRD.md](./docs/PRD.md) core features:

| ID | Feature | Phase | Status |
|---|---|---|---|
| CF1 | On-chain policy registry | P1 | **Complete** |
| CF2 | Registered-oracle data submission | P1–P2 | **Complete** |
| CF3 | Multi-oracle consensus | P2 | **Complete** |
| CF4 | Automatic trigger evaluation and payout | P2–P3 | **Complete — M1 verified live** |
| CF5 | Plain-language claim ledger | P6–P7 | Not started |
| CF6 | Wallet-free farmer access | P7 | Not started |
| CF7 | Insurer admin console | P8 | Not started |
| CF8 | Oracle simulation harness | P5 | Not started |

Every core feature has at least one implementing task — verified during T0.9.

## Bugs Found

| Bug | Found at | Fix |
|---|---|---|
| `evaluatePolicy` compared `periodId` (days-since-epoch) directly against `startDate`/`endDate` (Unix seconds) — a unit-scale mismatch | P2, before compile | Convert `periodId * 1 days` before comparing — **D19** |

Known scaffold issues carried over from [docs/handoff.md](./docs/handoff.md), for awareness rather than action:

| Issue | Note |
|---|---|
| `npx tsc` resolves to a bogus `tsc@2.0.4` package | Use `./node_modules/.bin/tsc` |
| Stale `backend/src/deployment.json` and `frontend/dist/` reference the old ABI | Overwritten on next deploy — harmless, but a stale-artifact demo failure is TR7 |

## Bugs Fixed

| Bug | Fixed at |
|---|---|
| `periodId`/date unit-scale mismatch in `evaluatePolicy` (see Bugs Found) | P2, before compile — never shipped |

## Next Actions

**P3 is complete, M1 reached, and stopped for review (Rule 16). Awaiting confirmation before P4 begins.**

**P4 needs a credential before it can start:** a Supabase project URL and anon key (create a free project at supabase.com if one doesn't exist yet). I will ask for this at the start of P4 rather than blocking silently.

P4 — Supabase and data layer (T2.1–T2.5), timeboxed to 45 minutes for T2.1–T2.3 per **TR4**, with an in-memory fixture fallback if it overruns:

1. **T2.1** — add `@supabase/supabase-js`; connect to the user-provided project
2. **T2.2** — apply schema SQL: five tables, constraints, indexes, `set_updated_at` trigger, RLS
3. **T2.3** — seed `oracle_sources` and `weather_feed` with all three demo scenarios
4. **T2.4** — `services/supabase.ts` — every query degrades to `null` on failure, never throws
5. **T2.5** — replace `chain.ts` with `insurance.ts`: read-only contract access, 5s TTL cache

P5 (T2.6–T2.10, oracle harness, M2 checkpoint) does not begin until P4 is reviewed and confirmed. P5 also carries a new item, **T2.6a**, added per user instruction 2026-09-09: wrap the harness's data read behind a `WeatherSource` adapter interface once T2.6 works, so real IMD/Sentinel feeds can later replace the simulated one without touching the contract or the (future, P9) notification pipeline.

Before starting, read [docs/AgentRules.md](./docs/AgentRules.md), [docs/TRD.md](./docs/TRD.md) §Contract Specification, and [docs/Schema.md](./docs/Schema.md) — Schema is canonical for every entity and field name.

---

## Related documents

- [PRD](./docs/PRD.md) · [TRD](./docs/TRD.md) · [User Flows](./docs/UserFlows.md) · [Design](./docs/Design.md) · [Schema](./docs/Schema.md) · [Implementation Plan](./docs/ImplementationPlan.md) · [Agent Rules](./docs/AgentRules.md)
