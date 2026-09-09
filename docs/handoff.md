# Handoff — KisanShield (PS3, parametric crop insurance) — 2026-09-09

## Goal

Build **KisanShield** for hackathon problem statement PS3: parametric crop
insurance where an objective weather trigger, not a manual loss survey,
decides payout — and the farmer can see *why* they were or were not paid.

Two differentiators carry the pitch:

1. **Multi-oracle consensus** — two independent weather feeds must agree
   within a tolerance before any payout. This is the answer to "why not just
   a database".
2. **Plain-language claim ledger** — a public, wallet-free page where a farmer
   looks up a policy ID and reads what happened in words, not jargon.

Budget ~15 hours solo. Judged on Understanding, Innovation & Originality,
Approach, Technical & Implementation Feasibility, Proposed Solution, Impact.

The repo is currently a generic `MessageBoard` demo scaffold. The work is a
**repoint of that working scaffold**, not a greenfield build.

## Current state

- Branch: `master`, last commit: `73cd154` "Scaffold blockchain hackathon
  dApp: contracts, backend, frontend"
- Working tree: **dirty — untracked files only, nothing tracked modified.**
  `git diff --stat` is empty.

```
?? TRACKER.md
?? docs/AgentRules.md
?? docs/Design.md
?? docs/ImplementationPlan.md
?? docs/PRD.md
?? docs/PS3-context-for-claude-code.md
?? docs/Pitch.md
?? docs/Schema.md
?? docs/TRD.md
?? docs/UserFlows.md
?? docs/handoff.md
?? docs/phase0.md
```

- **Phase 0 is complete.** All eight deliverables mandated by
  `docs/phase0.md` exist and are approved: PRD, TRD, UserFlows, Design,
  Schema, ImplementationPlan, AgentRules (all in `docs/`), and `TRACKER.md`
  at the **repo root**.
- `docs/Pitch.md` also exists — a 10-minute ideation-round speaker script,
  not a phase0 deliverable.
- **No production code has been written or modified.** Rule 1 of
  `docs/AgentRules.md` is satisfied; the tracker records zero files modified.

Verified by execution this session (2026-09-09):

- `npm test` → **8 passing**, `MessageBoard` suite, 484ms
- `npm run typecheck` → **clean**, backend and frontend both

Carried over from 2026-09-08 and **not re-verified this session** — treat as
assumed, not confirmed:

- Local Hardhat node → deploy → on-chain write → read back via
  `GET /api/posts` round trip
- `npm run build --workspace @global/frontend` production build
- Vite `/api` proxy to the backend

Untested, by definition — every PS3 feature. Nothing in the insurance domain
exists yet in code.

## Files actively being edited

Nothing in progress. All twelve untracked files are complete documents, not
half-finished edits. The tree contains no partial work.

## Failed attempts

No failures this session — every file write and verification command
succeeded on first run.

Two environment traps carried forward from 2026-09-08, both still live:

- **`npx tsc` resolves to a bogus `tsc@2.0.4`** from the npm registry rather
  than the local TypeScript, printing "this is not the tsc you're looking
  for". Use `./node_modules/.bin/tsc` directly. The workspace
  `npm run typecheck` scripts already do the right thing — this only bites
  when invoking tsc by hand.
- **`import.meta.env` typecheck errors** in `frontend/src/lib/`, fixed by
  `"types": ["vite/client"]` in `frontend/tsconfig.json`. Already committed —
  listed so nobody re-diagnoses it.

Known stale state, tracked as risk **TR7** in `docs/ImplementationPlan.md`:
`backend/src/deployment.json` and `frontend/dist/` still reference the old
MessageBoard ABI and address `0x5FbDB2315678afecb367f032d93F642f64180aa3`.
Both are overwritten by the next `deploy.js` run — harmless, but do not trust
either file until a fresh deploy has happened.

## Things the next session should not re-derive

Established by exploration, and consequential enough to be worth stating
plainly:

- **There is no Supabase in this repo.** No dependency, no client, no tables —
  despite the brief listing it as part of the existing stack. It is entirely
  new construction, timeboxed to 45 minutes at TR4 with an in-memory fixture
  fallback if it overruns.
- **`MessageBoard.sol` has zero access control** — no `Ownable`, no roles, no
  escrow, no oracle interface. Every authorisation mechanism in the TRD is new
  code, not an extension of something existing.
- **The scaffold's domain has zero overlap with crop insurance**, so the
  contract is *deleted* rather than refactored. Recorded as decision **D5**.
- **`docs/Schema.md` is canonical** for every entity and field name. Where any
  other document disagrees with it, Schema wins.

## Next step

**T1.1 — add the OpenZeppelin contracts dependency to the `contracts`
workspace**, then proceed through P1 (T1.1–T1.15, ~4h) building
`CropInsurance.sol` per `docs/TRD.md` §Contract Specification.

**Blocker: authorisation.** Phase 0 was explicitly scoped "docs only, then
stop". The user has approved the Phase 0 documents but has *not* green-lit
implementation — a pitch was requested instead. Confirm before writing code.

Before starting, follow the Rule 2 checklist in `docs/AgentRules.md`: read
`TRACKER.md` for current state, then the task's entry in
`docs/ImplementationPlan.md` for dependencies and acceptance criteria.

Two acceptance details in P1 that are easy to miss and expensive to get
wrong:

- A reading exactly **equal** to the threshold does **not** pay (strictly
  below, decision **D8**). T1.12 mandates a boundary test.
- `evaluatePolicy` is **permissionless** (decision **D6**) — anyone may call
  it. A privileged evaluator could suppress a payout by simply never calling,
  recreating the discretionary gate this product exists to remove.
