import { ethers } from "ethers";
import { config, loadDeployment } from "../config.js";
import type { WeatherSource } from "./weatherSource.js";

/**
 * Simulates two independent oracle feeds submitting readings on-chain
 * (T2.6). This is the only place in the backend that writes to the chain —
 * everything in insurance.ts is read-only (D14). Calls WeatherSource for
 * data (T2.6a) and knows nothing about where that data actually comes from.
 */

// Hardhat's default deterministic mnemonic (public, same on every Hardhat
// project — "test test test ... junk"). Derives the same oracleA/oracleB
// keys that contracts/scripts/seed.js registers via getSigners()[1], [2].
// Override via ORACLE_A_KEY/ORACLE_B_KEY for any non-local network.
const HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";

function makeOracleWallet(index: 1 | 2, provider: ethers.Provider): ethers.Wallet {
  const envKey = index === 1 ? process.env.ORACLE_A_KEY : process.env.ORACLE_B_KEY;
  if (envKey?.trim()) return new ethers.Wallet(envKey.trim(), provider);

  const hd = ethers.HDNodeWallet.fromPhrase(HARDHAT_MNEMONIC, "", `m/44'/60'/0'/0/${index}`);
  return new ethers.Wallet(hd.privateKey, provider);
}

const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const deployment = loadDeployment();

// Long-lived, module-level wallets. ethers derives each transaction's nonce
// from a fresh getTransactionCount("pending") call unless the caller
// serializes sends — re-instantiating a Wallet per call has no memory of an
// in-flight tx, so two calls issued close together can both observe the
// same pending nonce and collide. Reusing one instance per address plus
// awaiting each send in turn (never in parallel) is what actually
// serializes them.
const oracleWallets: Record<1 | 2, ethers.Wallet> = {
  1: makeOracleWallet(1, provider),
  2: makeOracleWallet(2, provider),
};

function defaultOracleWallet(index: 1 | 2): ethers.Wallet {
  return oracleWallets[index];
}

function contractWithSigner(signer: ethers.Signer) {
  if (!deployment) {
    throw new Error(
      "No deployment found. Run `npm run deploy:local` in the contracts workspace first."
    );
  }
  return new ethers.Contract(deployment.address, deployment.abi as ethers.InterfaceAbi, signer);
}

export type SubmitResult = {
  sourceKey: "feed_a" | "feed_b";
  oracleAddress: string;
  submitted: boolean;
  value?: number; // real units, for logging
  reason?: string; // why nothing was submitted
  txHash?: string;
};

/** Same x100 scale as the contract (D7) — the one boundary where real units become the on-chain integer. */
function scaleValue(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

/**
 * Submits one reading from one feed (feed_a -> oracleA signer, feed_b ->
 * oracleB signer) for a policy/period, sourced via the given WeatherSource.
 * Returns a result rather than throwing on "nothing to submit" or "already
 * submitted" — those are expected outcomes for a demo control endpoint, not
 * failures.
 */
export async function submitFromFeed(
  source: WeatherSource,
  params: { policyId: number; regionId: string; periodId: number; sourceKey: "feed_a" | "feed_b" }
): Promise<SubmitResult> {
  const wallet = defaultOracleWallet(params.sourceKey === "feed_a" ? 1 : 2);

  const reading = await source.fetchReading({
    regionId: params.regionId,
    periodId: params.periodId,
    sourceKey: params.sourceKey,
  });
  if (!reading) {
    return {
      sourceKey: params.sourceKey,
      oracleAddress: wallet.address,
      submitted: false,
      reason: `No reading available from ${source.name} for ${params.regionId}/${params.periodId}`,
    };
  }

  try {
    const contract = contractWithSigner(wallet);
    const tx = await contract.submitReading(params.policyId, scaleValue(reading.value), params.periodId);
    const receipt = await tx.wait();
    return {
      sourceKey: params.sourceKey,
      oracleAddress: wallet.address,
      submitted: true,
      value: reading.value,
      txHash: receipt.hash,
    };
  } catch (err: any) {
    // DuplicateReading is expected on a re-run of the same scenario/period —
    // not an error worth surfacing as a 500.
    const message = err?.reason ?? err?.shortMessage ?? String(err?.message ?? err);
    return {
      sourceKey: params.sourceKey,
      oracleAddress: wallet.address,
      submitted: false,
      value: reading.value,
      reason: message,
    };
  }
}

/** Submits from both feeds and evaluates. The demo-control entry point (T2.7 wires this to a route). */
export async function runScenario(
  source: WeatherSource,
  params: { policyId: number; regionId: string; periodId: number }
): Promise<{ submissions: SubmitResult[]; evaluationTxHash?: string; evaluationError?: string }> {
  // Sequential, not Promise.all: evaluation below reuses the feed_a wallet
  // (any registered-or-not address may call evaluatePolicy — D6 — feed_a's
  // is simply convenient), so every send through that wallet must be
  // awaited in turn or its nonce can be read before the prior send lands.
  const submissions: SubmitResult[] = [];
  for (const sourceKey of ["feed_a", "feed_b"] as const) {
    submissions.push(await submitFromFeed(source, { ...params, sourceKey }));
  }

  // Evaluate regardless of whether both submissions were fresh — a re-run
  // against already-submitted readings should still evaluate successfully,
  // since evaluatePolicy is permissionless and idempotent-safe (D6).
  const wallet = defaultOracleWallet(1); // any address may call evaluatePolicy
  try {
    const contract = contractWithSigner(wallet);
    const tx = await contract.evaluatePolicy(params.policyId, params.periodId);
    const receipt = await tx.wait();
    return { submissions, evaluationTxHash: receipt.hash };
  } catch (err: any) {
    const message = err?.reason ?? err?.shortMessage ?? String(err?.message ?? err);
    return { submissions, evaluationError: message };
  }
}
