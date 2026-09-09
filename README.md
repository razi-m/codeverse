# KisanShield

Parametric crop insurance with automatic payout (PS3). A smart contract —
not a human loss assessor — decides whether a farmer gets paid, based on
two independent weather feeds agreeing on a rainfall reading. Every
decision, paid or not, is recorded and explained in plain language on a
public page that needs no wallet, no login, and no install.

Two things carry the pitch:

1. **Multi-oracle consensus.** Two independently registered weather feeds
   must agree within a tolerance before any payout — the answer to "why
   not just a database".
2. **Plain-language claim ledger.** A public, wallet-free page
   (`/policy/:id`) where a farmer looks up a policy ID and reads what
   happened in words, not jargon — see `docs/Design.md` § The
   plain-language rule.

## Stack

| Layer | Tech |
|---|---|
| Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin, ethers v6 |
| Backend | Node + Express + TypeScript, Supabase (Postgres) |
| Frontend | React 18, Vite, react-router-dom, wagmi v2 + RainbowKit (insurer route only) |

## Prerequisites

- **Node.js 18+** and npm
- **git**
- **MetaMask** (or any wallet) — only needed for the insurer console at
  `/admin`. The farmer route needs no wallet at all.

A Supabase project is optional at runtime — everything that determines a
payout works with Supabase entirely unreachable (verified at T2.10). It
only supplies the oracle simulation's mock weather data and presentational
region names. If you want it: create a free project at
[supabase.com](https://supabase.com), run `backend/sql/schema.sql` then
`backend/sql/seed.sql` against it (SQL editor or `psql`), and set
`SUPABASE_URL`/`SUPABASE_ANON_KEY` in `backend/.env` (see
`backend/.env.example`).

## Quickstart

```bash
npm install          # one install covers all three workspaces
```

Then three terminals:

```bash
# 1 — local blockchain (leave running)
npm run chain

# 2 — deploy the contract, seed the demo policy, start the API
npm run deploy
npm run seed
npm run dev:api      # http://localhost:4000

# 3 — frontend
npm run dev:web      # http://localhost:5173
```

Open `http://localhost:5173/policy/1` — no wallet extension needed, no
wallet prompt will appear. Open `http://localhost:5173/admin` to manage
policies as the insurer (needs a wallet connected as the contract owner —
the first Hardhat account printed by `npm run chain`).

## Demo script

Reproduces all three scenarios from a cold start:

1. `npm run chain` — fresh node, clean state
2. `npm run deploy` — contract deployed, both `deployment.json` files written
3. `npm run seed` — two oracles registered, demo policy 1 created and funded
4. `npm run dev` — API on `:4000`, web on `:5173`
5. `GET /api/health` — confirm contract address present, 2 oracles registered
6. Open `/policy/1` in a **clean browser profile with no wallet extension** — confirm full render
7. Drive each scenario via the oracle simulate endpoint:
   ```bash
   curl -X POST http://localhost:4000/api/oracles/simulate \
     -H "Content-Type: application/json" \
     -d '{"policyId":1,"scenario":"drought"}'    # pays out
   curl -X POST http://localhost:4000/api/oracles/simulate \
     -H "Content-Type: application/json" \
     -d '{"policyId":2,"scenario":"baseline"}'   # rejected — above threshold
   curl -X POST http://localhost:4000/api/oracles/simulate \
     -H "Content-Type: application/json" \
     -d '{"policyId":3,"scenario":"disagreement"}' # rejected — feeds disagree
   ```
   (Create policies 2 and 3 from `/admin` first, or reuse policy 1 across
   scenarios on distinct period IDs.)
8. Reload `/policy/:id` for each — the ledger explains the real outcome
   with real numbers, not a status code.

Step 6 is not optional. A wallet extension installed in the developer's
own browser can mask a farmer-path dependency on a wallet library that
would break for every judge who lacks one — this project structurally
prevents that (see **Architecture** below), and this step is how you
verify it stayed that way.

## Scripts

| Command | What it does |
|---|---|
| `npm run chain` | Start the local Hardhat node on `:8545` |
| `npm run deploy` | Deploy `CropInsurance.sol` to the local node |
| `npm run seed` | Register 2 oracles, create + fund the demo policy |
| `npm run dev` | Backend + frontend together |
| `npm test` | Contract test suite (23 tests) |
| `cd backend && npm test` | `explain.ts` unit tests (14 tests, incl. a banned-vocabulary check per string) |
| `npm run typecheck` | Typecheck backend and frontend |

## Layout

```
contracts/
  contracts/CropInsurance.sol   The contract — policy lifecycle, consensus, payout
  scripts/deploy.js              Deploys + syncs address/ABI into backend + frontend
  scripts/seed.js                Registers oracles, creates + funds the demo policy
  test/CropInsurance.test.js     23 tests incl. the equal-to-threshold boundary (D8)
                                  and the rejecting-farmer reentrancy case (E6)
backend/
  sql/schema.sql, seed.sql       Off-chain, non-authoritative (D1) — Supabase
  src/services/insurance.ts      Read-only chain access, 5s TTL cache
  src/services/explain.ts        The ONLY source of farmer-facing text (D17)
  src/services/weatherSource.ts  Adapter interface — swap the simulated feed for
                                  a real one (IMD, Sentinel) without touching the
                                  contract or this file's callers
  src/routes/policies.ts         /api/policies, /:id, /:id/ledger, /:id/verify
  src/routes/oracle.ts           /api/oracles, /api/oracles/simulate (demo control)
frontend/
  src/main.tsx                   NO wallet provider here — see Architecture
  src/App.tsx                    Route shell; /admin is React.lazy()
  src/pages/                     Landing, PolicyView (farmer), Admin (insurer)
  src/components/farmer/         StatusBanner, ClaimLedger, ThresholdMeter, ...
  src/components/insurer/        AdminGate, PolicyTable, CreatePolicyForm, ...
```

## Architecture: the wallet-free guarantee is structural

The farmer route does not import a wallet library **at any depth**. This
is enforced at the module boundary, not by convention:

- `main.tsx` wraps the app in nothing but `BrowserRouter` — no
  `WagmiProvider`, no `RainbowKitProvider`.
- Those providers live only inside `pages/Admin.tsx`, loaded via
  `React.lazy()` from `App.tsx`. A production build's farmer-facing
  entry chunk contains zero references to wagmi, RainbowKit, MetaMask,
  or WalletConnect — verified by grepping the built bundle, not assumed.
- The backend never holds a user's private key. Reads flow through the
  backend (`insurance.ts`); writes go browser-to-chain via the insurer's
  own wallet. The only server-side signer is the oracle simulation
  harness, using dedicated oracle keys that are never the insurer's.

## How a payout actually happens

1. The insurer creates and funds a policy (`/admin`) — crop, region,
   cover amount, rainfall threshold, tolerance, cover period.
2. Two registered oracle feeds each submit a rainfall reading for the
   same period (`submitReading` — one reading per oracle per period,
   duplicate-guarded).
3. Anyone can call `evaluatePolicy` — it is deliberately permissionless
   (D6), so no privileged party can suppress a payout by simply not
   calling it.
4. If the two readings agree within tolerance and the agreed value is
   **strictly below** the threshold (D8 — equal does not pay), the
   contract pays the farmer automatically and marks the policy `PaidOut`.
   If not, it emits a specific rejection reason — never a silent no-op.
5. `explain.ts` turns that event history into the plain-language ledger a
   farmer reads at `/policy/:id`.

## Known limitations (stated, not hidden)

- Oracle registration is centralised to the contract owner — either feed
  disagreeing can block a payout, and no reading is cryptographically
  signed at its source. This is disclosed deliberately; a judge who finds
  it unaided trusts everything else less.
- Off-chain data (Supabase) uses an anon key with a permissive per-table
  policy rather than a service-role key with none, because a service-role
  key wasn't available this session (see `backend/sql/schema.sql` header,
  decision D20). The browser still never receives any Supabase
  credential — only which server-side key changed.
- `VegetationIndexBelow` is declared in the contract's `TriggerType` enum
  but has no evaluation branch — `RainfallBelow` is the only trigger this
  build demonstrates.
- This is a demo on a local Hardhat chain. No production deployment,
  audit, or real-money handling is implied.

## Deploying to a public testnet

Only needed if judging requires a live chain.

```bash
cd contracts
cp .env.example .env     # add SEPOLIA_RPC_URL and a THROWAWAY PRIVATE_KEY
npm run deploy:sepolia
```

Then set `RPC_URL` in `backend/.env` to the same endpoint.

## Security notes

- `.env` files are gitignored. Keep it that way.
- Use a throwaway wallet for any testnet deploy, never one holding real funds.
- The Hardhat local account keys (used by the oracle simulation harness) are
  publicly known by design — that's fine for a local chain, never for a
  live one.
