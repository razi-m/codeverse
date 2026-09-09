# Agent Operating Rules — KisanShield

**Parametric Crop Insurance with Automatic Payout (PS3)**

| | |
|---|---|
| Document | Agent Rules |
| Version | 1.1 |
| Status | Approved — Phase 0; Rule 16 added for eight-phase review model |
| Last updated | 2026-09-09 |
| Authority | These rules govern all work on this project |

---

## Preamble

These rules bind any agent — human or AI — working on this project.

Two things make them enforceable rather than decorative:

1. **[TRACKER.md](../TRACKER.md) is the single source of truth for project state.** It must be updated after every change. A change that is not in the tracker did not happen.
2. **The Phase 0 documents are the source of truth for every decision.** [PRD.md](./PRD.md), [TRD.md](./TRD.md), [UserFlows.md](./UserFlows.md), [Design.md](./Design.md), [Schema.md](./Schema.md), and [ImplementationPlan.md](./ImplementationPlan.md) are not background reading. When a question arises during implementation, the answer is in one of them — and if it is not, the document is updated before the code is written.

[Schema.md](./Schema.md) is canonical for every entity and field name. Where any document disagrees with it, Schema wins and the other document is corrected.

---

## Rule 1 — Never start implementation until all planning documents exist

All eight Phase 0 deliverables must exist, be reviewed, and be approved before any production code is written or modified.

**Status: satisfied.** All eight exist and are approved as of 2026-09-09. Implementation may begin at T1.1.

*Applied here:* the entire planning session was conducted without touching `contracts/`, `backend/`, or `frontend/`. The tracker records zero files modified.

## Rule 2 — Always read all documentation before making changes

Before starting any task, read the documents that govern it. At minimum, before every task: [TRACKER.md](../TRACKER.md) for current state, and [ImplementationPlan.md](./ImplementationPlan.md) for the task's dependencies and acceptance criteria.

*Applied here:*

| Working on | Read first |
|---|---|
| Contract code | TRD §Contract Specification, Schema §On-Chain Data Model, UserFlows §Decision Trees |
| Backend | TRD §Backend Requirements and §API Strategy, Schema §Off-Chain Data Model |
| Farmer UI | Design in full, UserFlows §Screen Flow, PRD §Personas |
| Anything touching money | Schema §Data Validation Rules, TRD §Security Requirements |

## Rule 3 — Always update TRACKER.md after modifications

Every change updates the tracker in the same working session, and the tracker is included in the same commit as the code it describes. State and history never diverge.

Each update refreshes: Current Phase, Active Task, Completed Tasks, Files Modified, Features Implemented, Bugs Found/Fixed, Blockers, Next Actions.

Task IDs in the tracker must match [ImplementationPlan.md](./ImplementationPlan.md) exactly. If the two disagree, that is a defect to fix immediately, not a discrepancy to tolerate.

## Rule 4 — Never delete functionality without explicit justification

Deletion requires a recorded reason in the tracker's Decisions Made.

*Applied here:* `MessageBoard.sol`, `MessageBoard.test.js`, `PostComposer.tsx`, and `PostList.tsx` are all scheduled for deletion. The justification is recorded as **D5** — the message-board domain has zero overlap with crop insurance: no access control, no roles, no escrow, no oracle interface. Only infrastructure is inherited. This is a deliberate, documented decision, not incidental cleanup.

## Rule 5 — Prefer incremental changes over large rewrites

Work proceeds task by task across **eight coding phases** (P1–P8, see [ImplementationPlan.md](./ImplementationPlan.md) §Phases). Each phase ends at a working, verified, committable state, and four of them — P3, P5, P7, P8 — end at a milestone checkpoint task (T1.15, T2.10, T3.17, T4.13) that must pass by execution.

The eight-way split exists so that each unit of work stays small enough to review in one sitting. See **Rule 16** for the gate that enforces it.

The one large rewrite in the plan — replacing the contract — is scoped as a deletion plus new construction rather than an in-place transformation, precisely because incremental modification of a contract with no shared domain concepts would be more error-prone, not less.

## Rule 6 — Maintain backward compatibility whenever possible

There are no external consumers and no deployed state, so compatibility obligations are internal:

- The `deployment.json` generation pattern is preserved exactly (**D13**), so address and ABI stay synchronised across all three workspaces.
- The split data path — reads via backend, writes via wagmi — is preserved (**D14**).
- Existing Express conventions are extended, not replaced: `/api` prefix, `offset`/`limit` pagination with `MAX_LIMIT = 100`, error middleware shape.
- The 5-second TTL cache in the chain service is retained.

Where compatibility is deliberately broken — the contract, the domain routes, the frontend components — it is because the old surface has no consumer and no domain relevance.

## Rule 7 — Document architectural decisions before implementing them

Every architectural decision is recorded in the tracker's Decisions Made **before** the code that depends on it is written.

Eighteen decisions (D1–D18) are recorded from Phase 0. Any new decision taken during implementation is added to the tracker at the moment it is made, with its rationale — not reconstructed afterwards from the code.

## Rule 8 — Create implementation tasks before coding

Every unit of work has an ID, a description, a priority, a dependency, and a status, in both [ImplementationPlan.md](./ImplementationPlan.md) and [TRACKER.md](../TRACKER.md).

Work discovered mid-implementation gets a task ID before it gets code. Unplanned work is the mechanism by which a 15-hour budget becomes a 25-hour one.

## Rule 9 — Validate assumptions before making architectural changes

Assumptions A1–A7 are recorded in [PRD.md](./PRD.md) with their consequences if wrong.

*Applied here:* the planning documents were written against a verified inventory of the actual repository, not an assumed one. That check found several things the brief had implied were present but were not — most consequentially, **there is no Supabase in the codebase at all** (no dependency, no client, no tables), despite the brief listing it as part of the existing stack. Had that gone unchecked, the schema document would have described modifying tables that do not exist. Similarly, `MessageBoard.sol` has no access control whatsoever, so every authorisation mechanism is new construction rather than an extension.

## Rule 10 — Keep documentation synchronized with implementation

When implementation diverges from a document, the document is updated in the same commit. A stale document is worse than an absent one, because it is trusted.

Particularly: if the contract's function signatures, event payloads, or reject codes change during P1, [TRD.md](./TRD.md) §Contract Specification and [Schema.md](./Schema.md) are updated before the phase is marked complete.

## Rule 11 — When requirements are unclear, generate options and choose the most scalable solution

Ambiguities are resolved explicitly and recorded, not resolved implicitly by whatever the code happens to do.

*Applied here* — the T0.9 review found six such ambiguities and closed each one:

- `periodId` semantics were undefined — two feeds could have submitted for the same window under different identifiers, making "agreement" meaningless. Now defined and derived identically by both feeds.
- Whether a value exactly equal to the threshold pays was ambiguous. Fixed as **strictly below** (**D8**) with a mandatory boundary test, because the ambiguity is worth one farmer's payout.
- Nothing prevented one oracle submitting twice to manufacture agreement with itself. Closed with a duplicate guard.
- Reject-reason granularity was too coarse to explain a non-payout, so it expanded to six distinct codes.
- "Supabase is non-authoritative" was an assertion with no test. It is now gated at T2.10 by verifying the payout path works with Supabase unreachable.
- The wallet-free guarantee rested on convention. It is now structural — route-level code splitting keeps wagmi off the farmer bundle.

## Rule 12 — Always consider security, performance, scalability, maintainability, accessibility, and mobile responsiveness

Each has a named home in the documents, so none is left to good intentions:

| Concern | Where it is specified |
|---|---|
| Security | TRD §Security Requirements (SEC1–SEC11), including stated limitations |
| Performance | TRD §Performance Requirements (PERF1–PERF5) |
| Scalability | TRD §Scalability Requirements |
| Maintainability | Single-responsibility services; `explain.ts` as the sole source of farmer-facing copy (**D17**) |
| Accessibility | Design §Accessibility, audited at T4.9 |
| Mobile | Design §Mobile Experience — farmer surface is mobile-first at 360px |

Two are treated as correctness rather than quality: **accessibility**, because the primary persona has low digital literacy and high stakes, and the **plain-language rule**, because an explanation a farmer cannot read fails the core requirement no matter how accurate it is.

## Rule 13 — Never claim completion without verification

Verification means **executing** the thing and observing the result. Reading the code and concluding it should work is not verification.

*Applied here:* the pre-existing [docs/handoff.md](./handoff.md) sets the standard — it records the scaffold as verified live (8/8 contract tests, a full round trip from node to deploy to on-chain write to backend read, a successful production build), not merely typechecked. Implementation claims are held to the same bar.

Specifically:

- "The contract works" requires the test suite green, including the equal-to-threshold boundary and the rejecting-farmer reentrancy case.
- "The farmer view works" requires opening it **in a browser with no wallet extension installed**. A developer's own browser can mask a wagmi dependency that would break for every judge.
- "The demo works" requires running the full script from a cold start, including both negative scenarios.

## Rule 14 — Before marking a task complete

All five, every time:

1. **Build successfully** — `npm run typecheck` at root; `npm run build` where applicable
2. **Run tests** — `npm test` at root; contract suite green
3. **Validate functionality** — execute the behaviour, per Rule 13
4. **Update documentation** — any document the change affects
5. **Update the tracker** — status, files modified, decisions, next actions

Never commit with failing tests. If a phase checkpoint cannot pass all five, the phase is not complete, and the tracker says so rather than rounding up.

## Rule 15 — Act as an owner of the product, not merely a code generator

The product is not the contract. The product is a farmer understanding why they were or were not paid.

Ownership shows up in the decisions that were not strictly required:

- **The negative case is a first-class flow**, not an edge case. A system that only demonstrates paying has not shown that the trigger decides anything.
- **`evaluatePolicy` is permissionless** (**D6**) even though a privileged version would be simpler, because a privileged evaluator could suppress a payout by never calling — recreating the exact discretionary gate this product exists to remove.
- **No confetti on payout** (**D18**). A payout means a farmer's crop failed. The moment gets clarity and dignity.
- **Known limitations are stated openly** in TRD §Security rather than omitted: oracle registration is centralised, either feed can block a payout, no reading is signed at source, no audit. A judge who finds these unaided trusts everything else less.
- **Basis risk is named as inherent** to parametric insurance rather than hidden — with the transparent ledger positioned as what makes it *visible* to the farmer instead of buried.

An owner ships something they would be willing to explain to Lakshmi in person. That is the bar.

## Rule 16 — Stop at the end of every phase and wait for confirmation

**Each of the eight coding phases ends at a hard stop.** The next phase does not begin — not even its first task — until the user has reviewed the completed phase and explicitly said to continue.

At the end of every phase:

1. Complete the Rule 14 gate — all five items
2. Update [TRACKER.md](../TRACKER.md) — phase status, files modified, decisions, blockers, next actions
3. Commit the phase as a single commit with the tracker included
4. Report: what was built, what was verified **by execution** (Rule 13), what was skipped or cut and why, and what the next phase begins with
5. **Stop.** Await explicit confirmation

Two failure modes this rule exists to prevent:

- **Rounding up.** A phase reported complete when its checkpoint did not actually pass. If the checkpoint fails, the phase is incomplete and the tracker says so — an honest blocked state is worth more than an optimistic green one, because the next phase is built on top of it.
- **Bleeding forward.** Starting the next phase's work because a dependency happens to be satisfied. Even where the dependency graph permits it, crossing a phase boundary early destroys the reviewability that the split exists to create. Parallelisation is permitted **within** a phase only.

A phase that overruns its estimate is reported and paused at the boundary regardless. Time pressure is a reason to consult the cut list in [ImplementationPlan.md](./ImplementationPlan.md), not a reason to skip a review gate.

---

## Quick reference — before every task

```
1. Read TRACKER.md            → current state, blockers
2. Read the task in           → dependencies, acceptance criteria
   ImplementationPlan.md
3. Read the governing docs    → Rule 2 table above
4. Confirm dependencies are   → Complete, not merely started
   satisfied
5. Do the work
6. Verify by execution        → Rule 13
7. Complete the Rule 14 gate  → all five
8. Update TRACKER.md          → same commit as the code
```

## Quick reference — at the end of every phase

```
1. Rule 14 gate               → all five items
2. Update TRACKER.md          → phase status, files, decisions
3. Commit the phase           → one commit, tracker included
4. Report to the user         → built / verified / skipped / next
5. STOP                       → await explicit confirmation (Rule 16)
```

---

## Related documents

- [PRD](./PRD.md) · [TRD](./TRD.md) · [User Flows](./UserFlows.md) · [Design](./Design.md) · [Schema](./Schema.md) · [Implementation Plan](./ImplementationPlan.md) · [Tracker](../TRACKER.md)
