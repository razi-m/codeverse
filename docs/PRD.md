# Product Requirements Document — KisanShield

**Parametric Crop Insurance with Automatic Payout (PS3)**

| | |
|---|---|
| Document | PRD |
| Version | 1.0 |
| Status | Approved — Phase 0 |
| Last updated | 2026-09-09 |
| Source problem statement | PS3 — Parametric Crop Insurance with Automatic Payout |

---

## Problem Statement

Under India's crop insurance schemes, a farmer who suffers weather-driven crop loss must wait months for a payout. The delay is structural, not incidental:

1. **Loss assessment is manual.** A claim triggers a physical survey — Crop Cutting Experiments, field visits by a loss assessor. Scheduling, travel, and paperwork consume weeks before an estimate even exists.
2. **The estimate is subjective.** Two assessors can reach different loss percentages for the same field. This makes disputes routine, and disputes add further months.
3. **The process is opaque to the farmer.** The farmer cannot see what data was used, who decided, or why the payout was the amount it was. When a claim is rejected, the farmer typically receives an outcome without a legible reason.
4. **The delay lands at the worst possible time.** A farmer who has lost a crop needs capital *now* — to buy seed for the next sowing season. A payout arriving five months later has often already been substituted by an informal loan at punitive interest.

The compounding failure: the farmer bears the cost of a slow, subjective, unauditable process at exactly the moment they are least able to absorb it.

## Vision

Crop insurance where the payout decision is made by objective, published data rather than by a human assessor's judgement — and where the farmer can read, in their own language and without any technical knowledge, exactly why they were or were not paid.

A farmer should be able to open a link, see "rainfall in your area was 12mm over 14 days, below your 20mm threshold — ₹25,000 was released to you on 14 August," and be able to verify that this record cannot have been altered after the fact.

## Goals

| ID | Goal | Rationale |
|---|---|---|
| G1 | Replace manual loss assessment with an objective, pre-agreed weather trigger | Removes the surveyor bottleneck and the subjectivity that causes disputes |
| G2 | Execute payout automatically the moment the trigger is verifiably met | Collapses months to seconds; removes the discretionary "approve the claim" step entirely |
| G3 | Make the trigger data and payout logic auditable to the farmer | The farmer can inspect the exact inputs and rule that produced their outcome |
| G4 | Ensure no single party can manipulate the weather data that drives payouts | Answers the central objection: a single controlled data feed reintroduces the trust problem blockchain was meant to remove |
| G5 | Require zero crypto knowledge or wallet ownership from the farmer | The target user has low digital literacy; any wallet requirement makes the system unusable in practice |
| G6 | Explain the negative case as clearly as the positive case | Trust is built by a legible rejection, not only by a payout |

## Success Metrics

Metrics are framed for a hackathon demonstration, with the production analogue named where they differ.

| ID | Metric | Target (demo) | Production analogue |
|---|---|---|---|
| M1 | Time from trigger condition being met to funds reaching the farmer | < 30 seconds | Same-day, vs. current 3–6 months |
| M2 | Human approval steps in the payout path | 0 | 0 |
| M3 | Farmer can state why they were or were not paid, unprompted, after viewing their policy page | Comprehensible to a non-technical reader on first viewing | ≥ 80% comprehension in field testing |
| M4 | Payout decisions traceable to an immutable on-chain record | 100% | 100% |
| M5 | Wallet installs required of the farmer | 0 | 0 |
| M6 | Single-party manipulation of a payout without detection | Not possible while ≥ 2 independent oracles are registered | Same, with a larger oracle set |
| M7 | Contract test coverage of trigger and payout logic | All branches: consensus reached / failed, threshold met / not met, double-payout, expiry, underfunding | Same, plus audit |

## Target Users

**Primary — Smallholder farmers in India.** Typically 1–5 acres. Enrolled in a crop insurance scheme, often through a bank or a cooperative rather than by direct choice. Smartphone access is common; app-install willingness and digital literacy are low. Frequently the affected party in a claims dispute and the party with the least visibility into it.

**Secondary — Insurers and scheme administrators.** Carry the operational cost of loss assessment and the reputational cost of delay and dispute. Want lower assessment cost and fewer disputes, but need confidence that automated payouts cannot be gamed.

**Tertiary — Oracle operators / data providers.** Weather station networks, satellite data providers, agricultural universities. Supply the readings that drive the trigger. In production these are IMD, ISRO Bhuvan, or private weather networks; in this build they are simulated.

## User Personas

### Persona 1 — Lakshmi, the Farmer

- 41, grows cotton on 2.5 acres in Vidarbha, Maharashtra.
- Owns an Android smartphone. Uses WhatsApp and YouTube fluently; has never installed a banking or finance app and does not want to.
- Enrolled in crop insurance through her bank at loan time. Does not have a copy of the policy terms and could not state her coverage amount.
- Filed a claim after a dry spell in 2024. Received a payout eleven weeks later, in an amount she did not understand and could not contest.
- **Needs:** to know whether she is covered, whether a payout is coming, and — if it is not — why not, in a form she can read and act on.
- **Cannot be asked to:** install a wallet, hold a private key, understand gas, or pay a transaction fee.
- **Success looks like:** she opens a link sent over WhatsApp, sees her policy in plain Marathi-shaped English, and understands the outcome without calling anyone.

### Persona 2 — Rajesh, the Insurer / Scheme Administrator

- 34, product operations at a regional insurer administering a state-backed parametric pilot.
- Comfortable with dashboards and data; not a blockchain engineer, but will be asked by his risk team how the system cannot be gamed.
- **Needs:** to create and fund policies, monitor active exposure, confirm oracle feeds are live, and produce an audit trail on demand.
- **Success looks like:** he creates a policy in under a minute, and when the payout fires he can show his risk committee the exact data that triggered it.

### Persona 3 — Meera, the Oracle Operator

- 29, engineer at a weather data provider contracted to supply rainfall readings.
- **Needs:** an unambiguous interface for submitting a reading for a given policy and period, and assurance that a submission cannot be quietly altered afterwards.
- **Success looks like:** her feed submits a reading, the submission is publicly visible, and her feed's agreement or disagreement with the other registered feed is on the record.

## User Stories

### Farmer

| ID | Story | Priority |
|---|---|---|
| US-F1 | As a farmer, I can open a link and see my policy — crop, area, coverage amount, and trigger condition — without logging in or installing anything | Must |
| US-F2 | As a farmer, I can see the current weather readings for my policy alongside my threshold, so I know where I stand before any payout happens | Must |
| US-F3 | As a farmer, when a payout is triggered, I can read a plain-language explanation of exactly why | Must |
| US-F4 | As a farmer, when a payout is *not* triggered, I can read an equally clear explanation of why not | Must |
| US-F5 | As a farmer, I can see the full history of readings and decisions on my policy, in order | Must |
| US-F6 | As a farmer, I can see proof that the record has not been altered since it was written | Should |
| US-F7 | As a farmer, I can see when two data sources disagreed about my area's weather, and that no payout was made on disputed data | Should |

### Insurer

| ID | Story | Priority |
|---|---|---|
| US-I1 | As an insurer, I can connect my wallet and be recognised as the administrator | Must |
| US-I2 | As an insurer, I can create a policy specifying farmer, crop, region, coverage amount, trigger type, threshold, and period | Must |
| US-I3 | As an insurer, I can fund a policy so the payout is provably backed before the season begins | Must |
| US-I4 | As an insurer, I can register the oracle addresses permitted to submit readings | Must |
| US-I5 | As an insurer, I can view all policies with their status and current readings | Must |
| US-I6 | As an insurer, I can see which policies are awaiting evaluation and which have paid out | Should |

### Oracle

| ID | Story | Priority |
|---|---|---|
| US-O1 | As an oracle operator, I can submit a reading for a policy, and only registered oracles can do so | Must |
| US-O2 | As an oracle operator, my submission is recorded immutably with my address and a timestamp | Must |
| US-O3 | As an oracle operator, I cannot overwrite a reading I have already submitted for a period | Should |

## Core Features

| ID | Feature | Description | Serves |
|---|---|---|---|
| CF1 | **On-chain policy registry** | Each policy is a record on-chain: farmer, crop, region, coverage amount, trigger type, threshold, period, status. Created and funded by the insurer. | G1, US-I2, US-I3 |
| CF2 | **Registered-oracle data submission** | Only addresses registered by the insurer may submit readings. Every submission is recorded with submitter and timestamp, and emits an event. | G4, US-O1, US-O2 |
| CF3 | **Multi-oracle consensus** | A payout requires readings from at least two independent registered oracles that agree within a configured tolerance. Disagreement blocks the payout and is recorded as a distinct, visible outcome. | G4, US-F7 |
| CF4 | **Automatic trigger evaluation and payout** | The contract itself evaluates the consensus value against the policy threshold and releases funds when the condition is met. No human approval step exists in the path. | G1, G2 |
| CF5 | **Plain-language claim ledger** | A chronological, jargon-free account of every reading and every decision on a policy, rendered from on-chain events. Explains both payouts and non-payouts. | G3, G6, US-F3, US-F4, US-F5 |
| CF6 | **Wallet-free farmer access** | The farmer views a policy at a public URL by policy ID. No wallet, no login, no install. | G5, US-F1 |
| CF7 | **Insurer admin console** | Wallet-connected surface for creating policies, funding them, registering oracles, and monitoring the portfolio. | US-I1, US-I2, US-I4, US-I5 |
| CF8 | **Oracle simulation harness** | Two independent simulated feeds that read from a mock weather dataset and submit on-chain from distinct addresses, driving the demo. | CF2, CF3 |

## Nice-to-Have Features

| ID | Feature | Notes |
|---|---|---|
| NH1 | Vegetation-index (NDVI) trigger in addition to rainfall | Second trigger type; rainfall is simpler to simulate convincingly. First on the cut list per the build brief. |
| NH2 | Third oracle with median-of-three consensus | Strengthens the trust story; two-of-two is sufficient to make the point. |
| NH3 | Dispute window before payout finalisation | A delay in which a flagged reading can be challenged. Conceptually valuable, expensive to build. |
| NH4 | SMS / WhatsApp payout notification to the farmer | High real-world value, but requires a messaging provider and adds a live external dependency during judging. |
| NH5 | Multilingual farmer UI (Hindi, Marathi) | Directly serves the persona; deferred as a polish item. |
| NH6 | QR code on the policy linking to the public farmer view | Cheap and demo-friendly. |
| NH7 | Partial / tiered payouts scaled to severity | Realistic parametric products pay in bands rather than all-or-nothing. |

## Functional Requirements

### Policy management

- **FR1** The insurer, and only the insurer, can create a policy specifying farmer identifier, crop type, region identifier, coverage amount, trigger type, threshold value, and start/end dates.
- **FR2** A policy must be funded to at least its coverage amount before it can pay out. An unfunded policy cannot reach a paid state.
- **FR3** Each policy is assigned a unique, sequential, publicly readable identifier.
- **FR4** A policy has exactly one status at any time: `Active`, `PaidOut`, `Expired`, or `Cancelled`.
- **FR5** Policy terms are immutable once created. Correcting a policy requires cancelling and reissuing it, and both actions are on the record.

### Oracle data

- **FR6** The insurer can register and deregister oracle addresses.
- **FR7** Only a registered oracle address can submit a reading.
- **FR8** A submission records policy ID, value, observation period, submitting address, and block timestamp, and emits an event.
- **FR9** An oracle cannot submit more than one reading per policy per observation period.
- **FR10** All submitted readings are publicly readable, including readings that did not lead to a payout.

### Trigger evaluation and payout

- **FR11** Evaluation requires readings from at least two distinct registered oracles for the same observation period.
- **FR12** Readings agree when they fall within a configured tolerance of one another. Agreement yields a single consensus value.
- **FR13** If the readings do not agree within tolerance, no payout occurs, and the disagreement is recorded as an explicit outcome.
- **FR14** If the readings agree, the contract compares the consensus value to the policy threshold according to the trigger's direction (e.g. rainfall *below* threshold).
- **FR15** When the condition is met and the policy is `Active`, funded, and within its period, the contract transfers the coverage amount to the farmer and sets status to `PaidOut`.
- **FR16** A policy can pay out at most once. Any subsequent evaluation is rejected.
- **FR17** Evaluation can be invoked by anyone. Correctness does not depend on who calls it, and no privileged party can suppress a payout that is due.
- **FR18** Every evaluation emits an outcome event, whether it results in a payout or not.

### Farmer-facing ledger

- **FR19** A policy is viewable at a public URL by policy ID, with no authentication.
- **FR20** The farmer view shows policy terms, current readings against the threshold, status, and full decision history.
- **FR21** Every decision is accompanied by a plain-language explanation naming the actual numbers involved.
- **FR22** Non-payout outcomes are explained with the same prominence as payouts.
- **FR23** The farmer view exposes the underlying on-chain record for verification, without requiring the farmer to interpret it.

### Insurer console

- **FR24** The insurer authenticates by connecting a wallet whose address matches the contract owner.
- **FR25** The console supports policy creation, funding, oracle registration, and portfolio monitoring.
- **FR26** A non-owner wallet cannot access administrative actions.

## Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR1 | Performance | Farmer policy view renders within 2 seconds on a mid-range Android device over 4G |
| NFR2 | Performance | Payout transaction confirms within 30 seconds of the triggering evaluation |
| NFR3 | Availability | The demo runs entirely on a local Hardhat node; no live external network dependency is required for the payout path |
| NFR4 | Accessibility | Farmer-facing surfaces meet WCAG 2.1 AA: contrast, keyboard navigation, screen-reader labelling. Status is never conveyed by colour alone |
| NFR5 | Usability | Farmer surfaces use no unglossed technical vocabulary. Terms like "wei", "gas", or "transaction hash" never appear without a plain-language equivalent |
| NFR6 | Mobile | Farmer surfaces are mobile-first and fully usable at 360px width |
| NFR7 | Security | Funds can only leave the contract to the farmer address recorded in the policy |
| NFR8 | Security | Administrative functions are restricted by on-chain ownership, not by frontend checks |
| NFR9 | Auditability | Every state transition affecting money emits an event sufficient to reconstruct the decision |
| NFR10 | Integrity | Off-chain storage is never authoritative. Deleting the entire off-chain database must not change any payout outcome or lose any decision record |
| NFR11 | Maintainability | The point at which a real weather API would replace the simulated feed is isolated to a single, clearly identified module |
| NFR12 | Testability | All contract trigger and payout branches are covered by automated tests |

## Risks

| ID | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Simulated oracle data reads as unconvincing — "you just made the numbers up" | High | High | Make the oracle *interface* production-shaped and identify the exact swap point for a real feed. Demonstrate that the contract cannot distinguish a simulated submitter from a real one — the trust model rests on registration and consensus, not on data provenance |
| R2 | Judges ask "why not just a database?" and the answer is weak | High | Medium | The multi-oracle consensus layer is the answer, and it is built as a core feature rather than deferred. A database with one administrator can be edited; a payout requiring independent agreement, recorded immutably, cannot be quietly reversed |
| R3 | Consensus tolerance is mis-tuned — too tight blocks legitimate payouts, too loose defeats the purpose | Medium | Medium | Make tolerance a per-policy parameter with a justified default. Demonstrate both the agreement and the disagreement path in testing |
| R4 | The ~15-hour budget is exceeded and the build is incomplete at demo time | High | Medium | Phased plan with a checkpoint after each phase, and a pre-agreed cut list. Phase 1 alone constitutes a demonstrable product |
| R5 | Basis risk — the trigger fires when there was no real loss, or fails to fire when there was | Medium | High (inherent) | Acknowledge openly as an inherent property of parametric insurance rather than a defect of this implementation. Position the transparent ledger as what makes basis risk *visible* to the farmer instead of hidden |
| R6 | Scaffold repointing takes longer than expected — the existing contract shares no domain logic with the target | Medium | Medium | Only the infrastructure is reused (deploy pipeline, chain service structure, split read/write data path). Domain code is written fresh rather than adapted |
| R7 | Supabase adds a live external dependency that fails during judging | Medium | Medium | Off-chain data is strictly non-authoritative. The payout path must remain fully functional with Supabase unreachable; the farmer view degrades to on-chain data only |
| R8 | Farmer-facing plain language is written by engineers and remains subtly technical | Medium | High | Explicit review pass against the persona. Any sentence a non-technical reader could not parse is rewritten |
| R9 | Local-node-only deployment reads as insufficiently real | Low | Medium | State the choice openly as a judging-reliability decision, and confirm the contract is network-agnostic |

## Assumptions

| ID | Assumption | If wrong |
|---|---|---|
| A1 | Farmers have smartphone access and can open a link, but will not install an app or a wallet | The wallet-free design is unnecessary but harmless; it remains the safer bet |
| A2 | Weather data at the required granularity is obtainable from at least two independent sources in production | Multi-oracle consensus degrades to single-source, weakening the trust model |
| A3 | Farmers, insurers, and regulators accept an objective trigger as a fair proxy for actual loss | The parametric model itself does not apply; this is the premise of the problem statement |
| A4 | The insurer funds policies up front rather than paying from a pooled reserve | Funding model changes; per-policy escrow is the more conservative and demonstrable choice |
| A5 | Policy terms are agreed off-chain before creation; the contract records rather than negotiates them | An on-chain agreement flow would be needed — out of scope |
| A6 | Payout in a single transfer to one recipient address is sufficient | Split or staged disbursement would need additional logic |
| A7 | A demo audience accepts a local chain as a faithful stand-in for a public network | Testnet deployment would be needed, adding a live dependency |

## Constraints

| ID | Constraint | Source |
|---|---|---|
| C1 | Total build budget approximately 15 hours, solo developer | Project brief |
| C2 | Developer has no prior blockchain domain expertise | Project brief — favours simple, well-trodden contract patterns over novel cryptography |
| C3 | Stack is fixed: Solidity 0.8.24 / Hardhat / ethers v6; Node + Express + TypeScript; React 18 + Vite + wagmi v2 + RainbowKit + viem; Supabase | Existing scaffold |
| C4 | Deployment target is a local Hardhat node | Judging reliability — no network dependency, no real gas |
| C5 | The existing codebase is a generic message-board demo with no domain overlap; all domain logic is new | Repository state at commit `73cd154` |
| C6 | No live weather API integration | Explicit non-goal |
| C7 | The farmer path must function with zero wallet involvement | Auth model carried from prior approach |

## Out of Scope

- **Live weather or satellite data integration.** No IMD, ISRO Bhuvan, or commercial weather API. Simulated feeds only. The integration point is identified in the architecture but not built.
- **Insurance regulatory compliance.** No IRDAI product filing, solvency modelling, or reinsurance treatment.
- **Production-grade decentralised oracle infrastructure.** No Chainlink node operation, staking, or slashing. A two-source agreement pattern is sufficient to demonstrate the principle.
- **Premium collection and underwriting.** Pricing, risk modelling, and premium payment flows are assumed to occur outside the system.
- **KYC and farmer identity verification.** Farmer identity is assumed established at enrolment.
- **Fiat on/off-ramp.** Payout settles on-chain; conversion to a bank account is out of scope.
- **Mainnet or public testnet deployment.** Local node only.
- **Multi-tenancy.** A single insurer operates a single contract instance.
- **Historical claims migration.** No import of existing PMFBY or insurer claim data.
- **Native mobile applications.** Responsive web only.

---

## Related documents

- [Technical Requirements](./TRD.md) — architecture and technology decisions
- [User Flows](./UserFlows.md) — journeys and decision trees
- [Design](./Design.md) — design system and component inventory
- [Schema](./Schema.md) — on-chain and off-chain data model
- [Implementation Plan](./ImplementationPlan.md) — phased task breakdown
- [Agent Rules](./AgentRules.md) — operating rules
- [Tracker](../TRACKER.md) — single source of truth for project state
