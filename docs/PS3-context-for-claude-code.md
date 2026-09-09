# PS3 — Parametric Crop Insurance with Automatic Payout
**Build context for Claude Code**

## Situation
- Solo developer. Total build budget ~15 hours end-to-end (ideation round only until 3:00 PM, no coding pressure before then).
- Zero prior blockchain domain knowledge.
- Same project/stack already scaffolded in Claude Code as the earlier PS1 attempt — reusing it, just repointing the build at PS3.
- Judging criteria: Understanding, Innovation & Originality, Approach, Technical & Implementation Feasibility, Proposed Solution, Impact.

## Problem statement (as given)
Under crop insurance schemes, farmers wait months for claim assessment and payouts, and disputes over loss estimation are routine.

**Problem to solve:**
- Define objective weather or satellite triggers for payout instead of manual loss surveys.
- Execute payouts automatically the moment a trigger is verifiably met.
- Make the trigger data and payout logic auditable to the farmer.

**Expected output:**
- Smart contract with oracle integration for rainfall or vegetation index data.
- End-to-end demo: trigger event → automatic payout → farmer notification.
- Transparent claim ledger a farmer can inspect in plain language.

## Stack (already scaffolded, carried over from PS1)
| Layer | Tech |
|---|---|
| Contracts | Solidity 0.8.24, Hardhat, ethers v6 |
| Backend | Node + Express + TypeScript |
| Frontend | React 18, Vite, wagmi v2, RainbowKit, viem |
| Off-chain DB | Supabase (Postgres) — accessed from the Express backend |

Deploy the contract to a **local Hardhat node** for the demo — no network dependency, no real gas, safest for live judging.

## Auth model (carried over)
- **Insurer/admin role:** wallet-based identity via RainbowKit + wagmi.
- **Farmer:** should need little to no wallet friction to view their policy and payout status — mirror the "no wallet, no crypto knowledge" bar from the earlier PS1 approach, since that's a strong, judge-legible pattern regardless of problem statement. A farmer can view/verify without ever touching a wallet; the insurer/oracle-trigger side uses wallets.

## Core idea — what actually needs to exist
1. **A policy record on-chain**: farmer, crop, region/plot identifier, coverage amount, trigger threshold (e.g. rainfall below X mm in Y days, or a vegetation index below a threshold), policy period.
2. **An oracle feed** bringing real-world weather/satellite data on-chain. For a hackathon demo, this will be a simulated/mock oracle (a function you or a script calls with a data value) rather than a live integration — but the *pattern* (data comes from an external, semi-trusted source and is written on-chain as an event) should be real, since this is the crux of the "why blockchain" story.
3. **A smart contract that checks the trigger condition and pays out automatically** — no manual claims adjuster step. This is the actual novelty: the contract itself decides, based on oracle data, whether to release the payout.
4. **A transparent claim ledger** the farmer can read in plain language: "Rainfall in your area was 12mm over 14 days, below your 20mm threshold → payout triggered, ₹X released on [date]."

## Differentiator — what to build toward (pending research findings)
The base "smart contract + oracle + auto payout" pattern is a known concept (Etherisc, Arbol, and various academic prototypes already do this globally, and India has non-blockchain parametric infrastructure like PMFBY's weather-station network and satellite-based yield estimation). Do not pitch the base loop as novel by itself.

Two places worth building real depth into, to be refined once the prior-art research comes back:
1. **The oracle-trust layer** — same core weakness as PS1's "why not just a database": if one party controls the weather data feed, they can manipulate payouts. Consider multiple independent oracle sources (e.g. two mock weather feeds) with the contract only triggering when they agree within tolerance, or a dispute window. This directly answers a technical judge's hardest question.
2. **The plain-language claim ledger for the farmer** — most existing systems are opaque to the actual farmer. A UI that shows *exactly* why a payout did or didn't happen, in simple terms, tied to an immutable on-chain record, is a legitimate differentiator especially against India's existing (often opaque, delay-prone) PMFBY claims process.

*(This section will get more specific once the prior-art research on PS3 comes back — will flag what to avoid duplicating and where the real gap is, same as we did for PS1.)*

## Data model (rough, will refine post-research)
**On-chain (Solidity):**
- `Policy { id, farmer, cropType, region, coverageAmount, triggerType, thresholdValue, startDate, endDate, status }`
- `submitOracleData(policyId, value, timestamp)` — restricted to registered oracle address(es)
- `checkAndPayout(policyId)` — evaluates trigger condition, releases payout if met, marks policy as claimed
- Events: `PolicyCreated`, `OracleDataSubmitted`, `PayoutTriggered`

**Off-chain (Supabase, via Express):**
- Historical weather/satellite data feed (mock dataset for demo)
- Farmer-facing plain-language claim explanations
- Policy metadata not needed on-chain (contact info, etc.)

## Build order (15-hour budget — checkpoint after each phase)
**Phase 1 — Core contract + payout logic**
- Solidity contract: create policy, submit oracle data, evaluate trigger, auto-payout
- Deploy to local Hardhat node, verify end-to-end with a manually-triggered mock data submission

**Phase 2 — Oracle simulation**
- A simple script/endpoint that feeds mock rainfall or vegetation-index data on a schedule or on-demand for the demo
- Wire this to the contract's `submitOracleData`

**Phase 3 — Farmer-facing transparent claim ledger**
- Plain-language UI: policy status, current trigger data vs. threshold, payout history
- No-wallet-friction viewing experience for the farmer

**Phase 4 — Admin/insurer view + polish**
- Wallet-connected view for creating policies, monitoring active policies, oracle status
- Visual polish, error/loading states

**Cut list if short on time:**
1. Multiple/agreeing oracle sources → fall back to single mock oracle
2. Satellite/vegetation-index trigger → fall back to simple rainfall threshold only (simpler to simulate convincingly)
3. Full policy-creation UI for insurer → fall back to a seeded/hardcoded demo policy

## Demo script to build toward (draft — refine post-research)
1. Show an existing policy: Farmer X, crop Y, region Z, trigger = "rainfall < 20mm over 14 days."
2. Feed mock oracle data showing rainfall dropping below threshold.
3. Contract automatically evaluates and triggers payout — no manual claim, no adjuster.
4. Farmer view shows the plain-language explanation and the payout, with the on-chain event as proof.
5. (If time allows) Show what happens when oracle data does *not* cross the threshold — no payout, and the farmer can see why, building trust in the negative case too.

## Explicit non-goals
- No live integration with a real weather API/satellite data provider (IMD, ISRO Bhuvan, etc.) — mock data only for the demo, but the integration point should be clearly identified in the architecture.
- No actual insurance-regulatory compliance modeling.
- No production-grade oracle security (e.g. real Chainlink-style decentralized oracle network) — a simplified multi-source-agreement pattern is enough to make the point.
