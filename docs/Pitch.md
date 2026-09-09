# 10-Minute Pitch Script — KisanShield

**PS3 — Parametric Crop Insurance with Automatic Payout**
Ideation round · solo delivery · no live demo

| | |
|---|---|
| Duration | 10 minutes (~1,350 words spoken at 135 wpm) + Q&A |
| Format | Spoken script with timings |
| Sources | [PRD.md](./PRD.md) · [TRD.md](./TRD.md) · [ImplementationPlan.md](./ImplementationPlan.md) · [Schema.md](./Schema.md) |

---

## Timing map

| # | Section | Time | Cumulative | Rubric criterion |
|---|---|---|---|---|
| 1 | The wait | 1:00 | 1:00 | **Understanding** |
| 2 | Why the wait exists | 1:00 | 2:00 | **Understanding** |
| 3 | The solution | 1:15 | 3:15 | **Proposed Solution** |
| 4 | Why not just a database | 1:30 | 4:45 | **Innovation & Originality** |
| 5 | What the farmer sees | 1:15 | 6:00 | **Innovation & Originality** |
| 6 | Architecture & stack | 1:15 | 7:15 | **Approach** |
| 7 | Implementation plan | 1:15 | 8:30 | **Technical Feasibility** |
| 8 | Challenges, openly | 1:00 | 9:30 | **Feasibility / Approach** |
| 9 | Impact & close | 0:30 | 10:00 | **Impact** |

**Rule for delivery:** if you are running long, cut from section 6 (architecture detail), never from 4 or 8. Section 4 is why you win; section 8 is why they believe you.

---

## 1 — The wait (1:00) · *Understanding*

> Lakshmi grows cotton on two and a half acres in Vidarbha. In 2024 the rain stopped. Her crop failed.
>
> She was insured. She filed a claim.
>
> **She was paid eleven weeks later.**
>
> [pause]
>
> By then she'd already borrowed from a moneylender — because the next sowing season doesn't wait eleven weeks. The insurance paid off the loan. It didn't save the season.
>
> And when the money came, she couldn't tell you how the amount was calculated. She was never shown the data. She was never given a reason. She was given an outcome.
>
> That's the problem. Not that the money didn't come — it came. It came **late**, it came **unexplained**, and it came **after** the moment it could have helped.

**Delivery note:** Slow. Let the eleven-weeks line land before moving. This is the only emotional beat in the pitch — everything after it is analytical, so it has to do its work here.

---

## 2 — Why the wait exists (1:00) · *Understanding*

> That delay isn't incompetence. It's structural. Three things cause it.
>
> **One — assessment is manual.** A claim triggers a physical survey. Crop Cutting Experiments, an assessor travelling to the field. Scheduling and paperwork consume weeks before an estimate even exists.
>
> **Two — the estimate is subjective.** Two assessors can look at the same field and reach different loss percentages. That's what makes disputes routine — and disputes add months.
>
> **Three — it's opaque.** The farmer can't see what data was used, who decided, or why the number is the number. When a claim is rejected, she gets the rejection. Not the reasoning.
>
> So: slow because it's manual, disputed because it's subjective, distrusted because it's invisible.
>
> **Fix the manual part and you fix the speed. Fix the subjective part and you fix the disputes. But you only earn trust if you fix the invisible part too — and that's the one everybody skips.**

**Delivery note:** The three-part structure is doing real work — it sets up section 3 (fixes 1 and 2) and section 5 (fixes 3). Signposting matters more than pace here.

---

## 3 — The solution (1:15) · *Proposed Solution*

> KisanShield is parametric crop insurance with automatic payout.
>
> **Parametric** means we don't measure the loss. We measure a **proxy** for the loss, agreed in advance. Rainfall below twenty millimetres over fourteen days. That's it. That's the whole trigger.
>
> No survey. No assessor. Nothing to dispute — because the threshold was fixed and published **before** the season started, and neither side can move it afterwards.
>
> Here's the actual mechanism.
>
> A policy lives on-chain: the farmer, the crop, the region, the coverage amount, the threshold, the period. The insurer funds it up front, so the money is **escrowed before the season begins** — visibly backed, not a promise.
>
> Independent weather sources submit readings on-chain. The contract compares them to the threshold. If rainfall came in below it — **the contract transfers the money. By itself.**
>
> There is no "approve claim" function. Not for the insurer, not for me, not for anyone. The approval step doesn't exist to be withheld.
>
> **Eleven weeks becomes about thirty seconds.**

**Delivery note:** "The approval step doesn't exist to be withheld" is the strongest sentence in this section. Pause after it.

---

## 4 — Why not just a database (1:30) · *Innovation & Originality*

> Now — the question every technical judge in this room is already forming.
>
> **"Why does this need a blockchain? A Postgres table and a cron job would do that."**
>
> Almost. Let me be honest about what's actually novel here, because "smart contract plus oracle plus payout" is a known pattern. Etherisc does it. Arbol does it. I'm not claiming that loop.
>
> Here's the real problem with the database version. **Whoever controls the weather data controls the payouts.**
>
> If one party writes the rainfall number, they can write a convenient one. If that party is the insurer, they're deciding their own liability. You haven't removed the trust problem — you've **moved** it, from the assessor to the database admin. And the admin is harder to see.
>
> So the thing I'm actually building depth into is the **oracle trust layer**.
>
> **Two independent weather sources. Both submit. The contract only acts if they agree within a tolerance.** If they disagree — no payout, and the disagreement itself is recorded permanently as a public event.
>
> That's what a database can't do. Not "stores data honestly" — four specific properties:
>
> - **The rule is committed before the data arrives.** Threshold fixed at policy creation, immutable.
> - **No single source can move a payout.** Not even the insurer.
> - **The decision executes, it isn't requested.** No one can decline to call it.
> - **A rejected claim can't be quietly deleted.** Append-only, publicly verifiable.
>
> **Remove any one of those and I'd tell you to use Postgres.** Together, they're the product.

**Delivery note:** This section wins or loses the round. Naming Etherisc and Arbol unprompted buys enormous credibility — it signals you did prior art and aren't overclaiming. Do not skip it to save time.

---

## 5 — What the farmer sees (1:15) · *Innovation & Originality*

> Second differentiator — and this one is about who the product is actually for.
>
> Most parametric systems are built for the **insurer**. Faster settlement, lower assessment cost. The farmer is still on the outside, still receiving outcomes.
>
> So: **Lakshmi never touches a wallet. She never installs anything. She never sees the word blockchain.**
>
> She gets a link on WhatsApp. She taps it. She sees one sentence:
>
> > **"₹25,000 was paid to you on 14 August. Rainfall in your area was 12 millimetres — below your 20 millimetre threshold."**
>
> Real numbers. Her units. Her threshold. And underneath, collapsed, a "verify this record" panel — the on-chain proof, there for a sceptic, invisible to everyone else.
>
> Now the part I want to be specific about, because it's the part most teams won't build.
>
> **The negative case gets equal billing.**
>
> If rainfall was 34mm and no payout was due, she sees that — with the same clarity, the same numbers, in the same place. Not an error. Not red. An explanation.
>
> And if the two weather sources disagreed, she sees **that** too: *"The two sources reported 12mm and 31mm. No payout was made on disputed data. This has been recorded."*
>
> **A system that only demonstrates the paying case hasn't proven the trigger decides anything.** Trust is built by a legible rejection — and today, a rejection is exactly where farmers get nothing at all.

**Delivery note:** Read the ₹25,000 quote as if reading her screen aloud — slower, slightly flatter. The contrast with your normal delivery does the work.

---

## 6 — Architecture and stack (1:15) · *Approach*

> Quickly, the build.
>
> **Contracts** — Solidity 0.8.24 on Hardhat, ethers v6. One contract: policy registry, oracle registration, consensus, escrow, payout. OpenZeppelin `Ownable` for access control — audited, and I'm not hand-rolling permissions on code that moves money.
>
> **Backend** — Node, Express, TypeScript. Reads chain state and converts events into plain language.
>
> **Frontend** — React 18, Vite, wagmi and RainbowKit for the insurer's wallet.
>
> **Off-chain** — Supabase Postgres, for the mock weather dataset and farmer contact details.
>
> Three decisions worth calling out.
>
> **First — the split data path.** Reads go through the backend; writes go browser-to-chain via the wallet. That means the farmer's page needs no wallet library at all. Her route doesn't even *import* wagmi — so a wallet prompt **can't** appear on it. The no-wallet promise is structural, not a discipline I have to maintain.
>
> **Second — the authority rule.** On-chain is authoritative for anything involving money or a decision. Supabase is convenience only. My test: **drop the entire database and no payout outcome changes, no decision record is lost.** You lose pretty region names. That's it. If the database could change a payout, I'd have built a database with extra steps.
>
> **Third — evaluation is permissionless.** *Anyone* can trigger the check. If only the insurer could, they could suppress a payout by never calling — and I'd have rebuilt the exact discretionary gate I'm removing.
>
> Demo runs on a **local Hardhat node**. No testnet, no faucet, no network dependency in front of judges.

**Delivery note:** This is the cut-for-time section. If you're behind, drop the three-bullet stack list and go straight to the three decisions — those are what a technical judge scores.

---

## 7 — Implementation plan (1:15) · *Technical Feasibility*

> Fifteen hours, solo. Four phases, each ending in something demonstrable.
>
> **Phase 1, about four hours — the contract.** Policy creation, funding, oracle registration, consensus, automatic payout. Full test suite. At the end of Phase 1 the core product works end to end on a local node. **Phase 1 alone is a demo.**
>
> **Phase 2, two and a half hours — the oracle simulation.** Two feeds submitting from separate addresses, reading a mock dataset. Three scenarios seeded as data, not code: payout, no-payout, and disagreement — switchable by a parameter.
>
> **Phase 3, three and a half hours — the farmer ledger.** The public policy page, the plain-language explanation service, the claim history.
>
> **Phase 4, three and a half hours — insurer console and polish.**
>
> Checkpoint after every phase. Each is a working, committable state.
>
> And I've pre-agreed a **cut list**, in order: multiple oracles collapse to one; the vegetation-index trigger drops to rainfall only; the policy-creation UI drops to a seeded demo policy.
>
> **What never gets cut:** the payout path, the consensus check, the plain-language ledger, and the no-wallet farmer access. Those are the product. Everything else is negotiable.

**Delivery note:** "Phase 1 alone is a demo" is the feasibility argument in one line. Judges have watched teams fail by building everything at once. Say it deliberately.

---

## 8 — Challenges, openly (1:00) · *Feasibility / Approach*

> Four hard problems. I'd rather name them than have you find them.
>
> **One — basis risk.** The trigger can fire when there was no real loss, or fail when there was. Rainfall is a proxy, not the crop. **This is inherent to all parametric insurance, not a bug in my build.** What I can do is make it *visible* — Lakshmi sees the exact reading against her exact threshold, so a mismatch is something she can see and contest. Today it's invisible. Long-term the fix is better-calibrated triggers and finer geographic granularity.
>
> **Two — oracle centralisation.** I'm registering the feeds. Consensus stops one *feed* from moving a payout; it doesn't stop an insurer who registers two colluding feeds. Honest answer: production needs independently governed operators with stake at risk — Chainlink-style, with slashing. My two-source agreement demonstrates the **pattern**, and the pattern is what scales.
>
> **Three — the data is simulated.** No live IMD or Bhuvan integration; there isn't time. But here's what matters: **the contract cannot tell the difference.** It trusts a registered address and a consensus rule — not a data source. Swapping a real feed in is one module, and I've isolated exactly where.
>
> **Four — the last mile.** Payout settles on-chain. Getting rupees into Lakshmi's bank account needs a regulated partner. Real, and out of scope for fifteen hours.
>
> **Two of these are hard problems in the field. Two are scope decisions I made deliberately. I think the difference matters.**

**Delivery note:** This section buys more credibility than any other. Judges expect defensiveness; volunteering limitations signals you understand the domain. Deliver it steadily, not apologetically — these are informed decisions, not confessions.

---

## 9 — Impact and close (0:30) · *Impact*

> PMFBY covers **tens of millions** of farmers. The delay and the opacity aren't edge cases — they're the standard experience.
>
> Parametric triggers cut settlement from months to seconds. Multi-source consensus means nobody can quietly tilt the data. And a plain-language ledger means the farmer isn't just paid faster — **she's finally told why.**
>
> [pause]
>
> Lakshmi waited eleven weeks and never got an explanation.
>
> **The version I'm building pays her in thirty seconds — and tells her exactly why, in words she can read.**
>
> Thank you.

**Delivery note:** Land "and tells her exactly why" as the final beat, not the thirty seconds. Speed is the feature; the explanation is the product.

---

## Anticipated Q&A

Prepare these four. The first two are near-certain.

**"Why blockchain and not a database?"**
> Four properties together: the rule is committed before the data arrives; no single source can move a payout; the decision executes rather than being requested; and rejected claims can't be deleted. Drop any one and I'd use Postgres. It's the combination — specifically that the *insurer* can't override it — that a database can't give you.

**"Your data is fake. Doesn't that invalidate the demo?"**
> It limits what the demo *proves*, and I'd separate two claims. It doesn't prove real-world accuracy — that needs real feeds and calibration. It does prove the trust mechanism, because the contract can't distinguish a simulated submitter from a real one. It trusts a registered address and a consensus rule. Swapping in a real feed changes one module.

**"What if the two oracles always disagree? Nobody ever gets paid."**
> Real failure mode. Tolerance is per-policy, so it's tuned to the measurement's actual variance. Two-of-two is conservative — either feed can block. The hardening is three sources with a median, so one outlier can't veto. I've scoped that as a known next step rather than pretending two is sufficient at scale.

**"Farmers don't have smartphones."**
> Many do; not all. The design assumes she can open a link but won't install an app — that's why there's no wallet and no download. For no-smartphone cases the same explanation works over SMS, and the payout doesn't depend on her doing anything at all. She doesn't have to *claim*. The contract pays whether or not she's watching.

---

## Pre-pitch checklist

- [ ] Rehearse once with a timer — target 9:30, leaving buffer
- [ ] Know the Lakshmi numbers cold: 2.5 acres, 11 weeks, ₹25,000, 12mm vs 20mm, 34mm negative case
- [ ] Be ready to name Etherisc and Arbol as prior art if challenged on novelty
- [ ] If asked "what's built so far" — answer honestly: planning complete, eight documents, implementation starts after this round
- [ ] If running long, cut section 6 detail. **Never cut 4 or 8.**
