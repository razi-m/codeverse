# Global — Blockchain Hackathon Scaffold

A working end-to-end dApp skeleton: Solidity contracts on Hardhat, a TypeScript
API, and a React frontend with wallet connection. Everything below is verified
running locally — no testnet or funding required to demo.

## Stack

| Layer | Tech |
|---|---|
| Contracts | Solidity 0.8.24, Hardhat, ethers v6 |
| Backend | Node + Express + TypeScript |
| Frontend | React 18, Vite, wagmi v2, RainbowKit, viem |

## Prerequisites

Install these before you start:

- **Node.js 18+** and npm — [nodejs.org](https://nodejs.org)
- **git**
- **MetaMask** browser extension — [metamask.io](https://metamask.io)

Optional, only for specific scenarios:

- **WalletConnect project ID** — free at
  [cloud.walletconnect.com](https://cloud.walletconnect.com). Needed for mobile
  and non-MetaMask wallets. Local MetaMask dev works with the `demo` placeholder.
- **Infura/Alchemy RPC URL + Sepolia test ETH** — only if you deploy to a public
  testnet instead of the local chain.

### Point MetaMask at the local chain

After starting the local node, add the network in MetaMask manually:

| Field | Value |
|---|---|
| Network name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency | `ETH` |

`npm run chain` prints 20 pre-funded test accounts. Import one private key into
MetaMask to get 10000 test ETH to play with. **These keys are public and
well-known — never send real funds to them.**

## Quickstart

```bash
npm install          # one install covers all three workspaces
```

Then three terminals:

```bash
# 1 — local blockchain (leave running)
npm run chain

# 2 — deploy contracts, then start the API
npm run deploy
npm run dev:api      # http://localhost:4000

# 3 — frontend
npm run dev:web      # http://localhost:5173
```

Or run the API and frontend together with `npm run dev` (after `npm run chain`
and `npm run deploy`).

## Scripts

| Command | What it does |
|---|---|
| `npm run chain` | Start the local Hardhat node on :8545 |
| `npm run deploy` | Deploy contracts to the local node |
| `npm run dev` | Backend + frontend together |
| `npm test` | Run the contract test suite |
| `npm run typecheck` | Typecheck backend and frontend |

## Layout

```
contracts/          Hardhat workspace
  contracts/        Solidity sources
  scripts/deploy.js Deploys + syncs address/ABI into the other workspaces
  test/             Contract tests
backend/
  src/services/     Chain reads via ethers
  src/routes/       REST endpoints
frontend/
  src/lib/          wagmi config, contract binding, API client
  src/components/   UI
```

## How it fits together

1. `deploy.js` deploys the contract, then writes `deployment.json` (address +
   ABI) into **both** `backend/src/` and `frontend/src/lib/`. Nobody ever
   hand-copies an address after a redeploy.
2. The **frontend writes directly to the chain** through the user's wallet —
   posting and tipping are signed in MetaMask, so no private key ever touches
   the server.
3. The **backend reads** chain state and serves it as JSON, with a 5s cache so a
   polling demo doesn't hammer the RPC. It stays up when the node is down so the
   UI can show "chain unreachable" instead of failing hard.
4. Vite proxies `/api` → `:4000` in dev, so the browser sees one origin and CORS
   never bites you mid-demo.

## The demo contract

`MessageBoard.sol` is an on-chain post feed with tipping. It's a **placeholder
chosen for its shape, not its subject** — it exercises the things almost every
hackathon dApp needs:

- state writes with validation and custom errors
- indexed events for cheap querying
- payable transfers (tips forward straight to the author; the contract never
  custodies funds)
- paginated reads so the frontend never pulls an unbounded array

### Making it your own

1. Rename/rewrite `contracts/contracts/MessageBoard.sol` for your idea.
2. Update `contracts/test/` and run `npm test` — keep tests passing as you go.
3. `npm run deploy` — the new ABI propagates automatically.
4. Update `functionName`/`args` in `frontend/src/components/` and the read
   helpers in `backend/src/services/chain.ts`.

## Deploying to a public testnet

Only needed if judging requires a live chain.

```bash
cd contracts
cp .env.example .env     # add SEPOLIA_RPC_URL and a THROWAWAY PRIVATE_KEY
npm run deploy:sepolia
```

Then set `RPC_URL` in `backend/.env` to the same endpoint.

## Security notes for the demo

- `.env` files are gitignored. Keep it that way — a leaked key in a public
  hackathon repo gets drained by bots within minutes.
- Use a throwaway wallet for testnet deploys, never one holding real funds.
- The Hardhat test account keys are publicly known by design.
