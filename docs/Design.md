# Design Documentation — KisanShield

**Parametric Crop Insurance with Automatic Payout (PS3)**

| | |
|---|---|
| Document | Design |
| Version | 1.0 |
| Status | Approved — Phase 0 |
| Last updated | 2026-09-09 |
| Implements | [PRD.md](./PRD.md), [UserFlows.md](./UserFlows.md) |

---

## Design System

### Governing principle

The system serves two audiences with opposed needs, so it is **two surfaces sharing one token set** — not one design stretched to cover both.

| | Farmer surface | Insurer surface |
|---|---|---|
| User | Low digital literacy, high stakes | Professional operator |
| Device | Mid-range Android, 4G | Desktop |
| Priority | Comprehension | Density |
| Density | Generous — one idea per screenful | Compact — tables, many rows |
| Type scale | Large | Standard |
| Vocabulary | Plain language only | Domain terms acceptable |
| Wallet UI | **Never present** | Always present |

Where the two conflict, the farmer surface wins on clarity and the insurer surface wins on density. Neither compromises toward the other.

### The plain-language rule

The single most important design constraint in the project. On any farmer-facing surface:

**Banned outright:** wei, gwei, gas, hash, nonce, block, address, wallet, smart contract, blockchain, oracle, consensus, on-chain, transaction, node, ABI, mainnet, testnet.

**Required substitutions:**

| Never write | Write instead |
|---|---|
| "Transaction hash `0x3f2a…`" | "Payment record" (hash behind *Verify this record*) |
| "Oracle submitted a reading" | "A weather source reported" |
| "Consensus reached" | "Both weather sources agreed" |
| "Smart contract executed payout" | "Your payout was released automatically" |
| "2000 (scaled)" | "20mm" |
| "25000000000000000000 wei" | "₹25,000" |
| "Policy status: PaidOut" | "Paid — ₹25,000 reached you on 14 August" |

Every number shown to a farmer is in the unit they think in: millimetres for rainfall, rupees for money, dates as "14 August 2026". Scaled integers and wei are internal representations that never reach a farmer's screen.

Enforcement is structural, not by review discipline: all farmer-facing strings originate in `backend/src/services/explain.ts` ([TRD.md](./TRD.md)), so the vocabulary audit has exactly one target file.

## Color Palette

Semantic tokens. Colour never carries meaning alone — every state pairs colour with an icon and a text label (NFR4).

### Core

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#fbfaf8` | `#0e1512` | Page background |
| `--surface` | `#ffffff` | `#16201c` | Cards |
| `--surface-sunken` | `#f4f2ee` | `#111a17` | Insets, table headers |
| `--border` | `#e3e0d9` | `#26332d` | Dividers |
| `--text` | `#1a1c1a` | `#eef2ef` | Primary text |
| `--text-muted` | `#5c6360` | `#9aa8a2` | Secondary text |

Warm off-white rather than clinical grey — this is an agricultural product, and the warmth reads as approachable to the primary persona without costing legibility.

### Semantic states

| Token | Light | Dark | Meaning | Icon |
|---|---|---|---|---|
| `--paid` | `#047857` | `#34d399` | Payout made | ✓ circle |
| `--active` | `#1d4ed8` | `#60a5fa` | Cover active, nothing wrong | shield |
| `--waiting` | `#b45309` | `#fbbf24` | Awaiting data, or sources disagreed | clock / alert |
| `--ended` | `#5c6360` | `#9aa8a2` | Expired or cancelled | archive |
| `--danger` | `#b91c1c` | `#f87171` | Destructive admin action only | warning |

**`--danger` never appears on the farmer surface.** A non-payout is not an error and must not be styled as one — it is a correct outcome explained clearly. Rendering "no payout due" in red would tell the farmer they did something wrong. Non-payout uses `--active` or `--waiting` depending on cause.

### Contrast

All text pairs meet WCAG AA — 4.5:1 for body, 3:1 for large text and non-text indicators — in both themes. `--paid` on `--surface` is 4.8:1 light, 7.1:1 dark. Verified before Phase 4 completion, not assumed.

## Typography

System font stack — no web font. A farmer on 4G should not wait on a font download for a page whose entire purpose is fast comprehension, and system fonts render Devanagari correctly on Android for the multilingual path (NH5).

```css
--font: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

Monospace is confined to the *Verify this record* panel — the only farmer-facing place where a hash or address appears.

### Scale

| Token | Farmer | Insurer | Use |
|---|---|---|---|
| `--fs-hero` | 28px / 1.25 | 24px | Status banner headline |
| `--fs-h1` | 22px / 1.3 | 20px | Section headings |
| `--fs-h2` | 18px / 1.35 | 16px | Card titles |
| `--fs-body` | **17px** / 1.6 | 15px / 1.5 | Body text |
| `--fs-small` | 15px / 1.5 | 13px | Metadata |
| `--fs-num` | 34px / 1.1 | 20px | Key figures — payout amount, reading vs threshold |

Farmer body text is 17px rather than the conventional 16px, with 1.6 line height. The cost is a little vertical space; the benefit is legibility on a mid-range phone in daylight for a reader who may not have perfect vision and is reading something financially consequential. Nothing on the farmer surface is smaller than 15px.

Measure caps at 65 characters for explanation text.

## Layout Principles

1. **Answer first.** The farmer's question — *am I getting paid?* — is answered in the top banner, above the fold, in one sentence. Everything else is supporting detail.
2. **One column on the farmer surface.** No side-by-side content at any breakpoint. Multi-column layouts create scan-order ambiguity for less confident readers.
3. **Progressive disclosure of the technical.** Proof is present but collapsed. *Verify this record* is closed by default: available to a sceptic, invisible to everyone else.
4. **Chronological ledger, newest first.** The most recent decision is what the farmer came for.
5. **Density is earned.** The insurer's table can be dense because its user scans professionally. The farmer's page cannot.

### Spacing

4px base scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Farmer cards use 24px internal padding and 16px gaps; insurer tables use 12px cell padding.

## Responsive Strategy

**Farmer: mobile-first.** Designed at 360px, enhanced upward. **Insurer: desktop-first**, usable at tablet width, not optimised for phone.

| Breakpoint | Width | Farmer | Insurer |
|---|---|---|---|
| `sm` | ≥360px | Baseline single column | — |
| `md` | ≥768px | Content capped at 640px, centred | Table becomes viable |
| `lg` | ≥1024px | Unchanged | Full console, sidebar |

The farmer layout stops growing at 640px. On a desktop the page is a centred column with generous margin — a wide screen should not turn a legible page into a sparse one.

**Touch targets:** minimum 44×44px on the farmer surface, 8px minimum spacing between adjacent targets.

## Component Inventory

Marked against the actual repository at commit `73cd154`. The scaffold is a message-board demo, so most domain components are new construction rather than adaptation.

### Frontend infrastructure

| Component | File | Disposition | Notes |
|---|---|---|---|
| Provider nesting | `frontend/src/main.tsx` | **Modify** | Add `BrowserRouter` inside existing wagmi → query → RainbowKit nesting |
| wagmi config | `frontend/src/lib/wagmi.ts` | **Reuse** | Unchanged — `hardhat` + `sepolia` chains already configured |
| Contract binding | `frontend/src/lib/contract.ts` | **Modify** | Same `deployment.json` import pattern, new ABI |
| API client | `frontend/src/lib/api.ts` | **Modify** | Same fetch pattern and `BASE` handling, new domain types |
| App shell | `frontend/src/App.tsx` | **Rewrite** | Becomes route definitions |
| Post composer | `frontend/src/components/PostComposer.tsx` | **Delete** | No domain overlap |
| Post list | `frontend/src/components/PostList.tsx` | **Delete** | No domain overlap |
| RainbowKit connect button | from library | **Reuse** | Admin route only |

### Farmer components — all new

| Component | Purpose |
|---|---|
| `StatusBanner` | The one-sentence answer. Colour + icon + text, `role="status"` |
| `PolicyTermsCard` | Crop, area, cover amount, trigger, period — in plain units |
| `ThresholdMeter` | Visual reading-vs-threshold comparison. Not a chart — a single labelled bar with the threshold marked |
| `ClaimLedger` | Chronological plain-language decision list |
| `LedgerEntry` | One event: date, plain sentence, the numbers involved |
| `VerifyPanel` | Collapsed proof: contract address, block, tx hash, raw event |
| `HowThisWorks` | Four-sentence parametric explainer, no jargon |
| `PolicyLookup` | Landing-page policy ID input |
| `FarmerErrorState` | Non-technical error with retry |

### Insurer components — all new

| Component | Purpose |
|---|---|
| `AdminGate` | Wallet connect + owner check, read-only fallback |
| `PolicyTable` | Dense portfolio: ID, farmer, crop, cover, status, funded, last reading |
| `CreatePolicyForm` | Full policy terms with validation |
| `FundPolicyAction` | Escrow deposit, shows shortfall |
| `OracleRegistry` | Registered feeds, last submission time, register/deregister |
| `OracleLivenessBadge` | Silent-feed warning — the failure most likely to look like a broken product |
| `TxStatus` | Pending / confirmed / rejected, technical language permitted here |

### Shared

`Card`, `Button`, `Badge`, `Skeleton`, `Money` (wei → ₹), `Measurement` (scaled int → mm), `DateDisplay`.

`Money` and `Measurement` are the enforcement points for the plain-language rule — no component formats a raw value inline.

## Accessibility Requirements

Target: **WCAG 2.1 AA** on farmer surfaces; AA on insurer surfaces except data-density concessions in tables.

| Requirement | Implementation |
|---|---|
| Contrast | 4.5:1 body, 3:1 large text and non-text indicators, both themes |
| No colour-only meaning | Every status = colour + icon + text label |
| Keyboard | All interactive elements reachable and operable; visible focus ring, 2px, 3:1 against adjacent colour |
| Screen readers | Semantic landmarks; `StatusBanner` is `role="status"` `aria-live="polite"`; ledger is an ordered list |
| Zoom | Usable to 200% without horizontal scroll |
| Motion | All animation gated on `prefers-reduced-motion` |
| Forms | Every input labelled; errors linked via `aria-describedby`, never colour-only |
| Language | `lang` attribute set; ready for NH5 multilingual |
| Touch | 44×44px minimum on farmer surfaces |
| Icons | Decorative icons `aria-hidden`; meaningful icons labelled |

`ThresholdMeter` needs particular care: it conveys quantitative comparison visually, so it carries a text equivalent — *"Rainfall 12mm, threshold 20mm — below threshold"* — in the accessible name, not only in the bar.

## Mobile Experience

The farmer surface is the mobile experience; it is designed at 360px first and everything else is enhancement.

- Single column, no horizontal scroll at any width
- Status banner and payout amount visible without scrolling on a 360×640 viewport
- 44px minimum touch targets, 8px minimum separation
- Numeric keypad (`inputmode="numeric"`) for the policy ID field
- `HowThisWorks` and `VerifyPanel` collapsed by default — the page opens short and expands on demand
- No hover-dependent interaction anywhere on the farmer surface
- Skeleton loaders sized to final content so the layout does not shift on load
- Route-level code splitting keeps wagmi and RainbowKit off the farmer bundle entirely (TRD, PERF5) — both a performance win and the structural guarantee that no wallet prompt can appear

## Desktop Experience

**Farmer on desktop:** the same page, centred, capped at 640px. Not re-laid-out into columns — one design, one set of behaviours to verify, and no wide-screen variant to keep in sync.

**Insurer console:** desktop-first. Persistent sidebar at `lg`, dense portfolio table with sortable columns, inline actions per row, oracle registry always visible in a side panel. Technical vocabulary is permitted — this user needs the address, the block number, and the transaction hash.

## Interaction Guidelines

### Farmer

- **No destructive actions exist.** The surface is read-only; nothing can be broken by tapping.
- Expandable sections animate open in 200ms with a rotating chevron.
- Loading uses skeletons matching final layout, never a spinner over blank space.
- Errors always offer a retry.
- Auto-refresh every 15 seconds while a policy is `Active` and awaiting evaluation, so a payout appears without a manual reload during the demo. Refresh is silent — no flicker, no scroll jump.

### Insurer

- Every state-changing action requires an explicit click, then a wallet signature.
- Buttons disable and show a pending label during confirmation.
- Optimistic UI is not used for on-chain writes — a transaction can revert, and showing success before confirmation is a lie the farmer might act on.
- Rejected transactions preserve form state.
- Cancel policy requires typed confirmation of the policy ID.

## Animation Guidelines

Restraint. Animation clarifies causality; it does not decorate.

| Motion | Duration | Easing | Purpose |
|---|---|---|---|
| Section expand | 200ms | `ease-out` | Show origin of new content |
| Status change | 300ms | `ease-in-out` | Mark a state transition |
| Skeleton shimmer | 1200ms loop | `linear` | Signal loading |
| Ledger entry appear | 250ms fade + 8px rise | `ease-out` | Draw attention to a new decision |
| Payout confirmation | 400ms scale 0.96→1 + fade | `ease-out` | The one moment worth marking |

All motion is wrapped:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**No confetti, no celebratory animation on payout.** A payout means a farmer's crop failed. The moment deserves clarity and dignity — a calm, confident state change — not celebration. This is a deliberate product-tone decision, not an oversight.

---

## Related documents

- [PRD](./PRD.md) — personas and requirements
- [TRD](./TRD.md) — architecture, explanation service
- [User Flows](./UserFlows.md) — screen and decision flows
- [Schema](./Schema.md) — data model
- [Implementation Plan](./ImplementationPlan.md) — phased tasks
- [Tracker](../TRACKER.md) — project state
