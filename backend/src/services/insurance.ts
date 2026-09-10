import { ethers } from "ethers";
import { config, loadDeployment, SEPOLIA_CHAIN_ID } from "../config.js";

/**
 * Read-only access to CropInsurance. Replaces chain.ts (the MessageBoard
 * service) — see docs/TRD.md § Backend Requirements. Writes (submitReading,
 * evaluatePolicy, createPolicy, ...) go browser-to-chain via wagmi from the
 * admin/oracle side (D14); the backend only ever reads.
 */

const CACHE_TTL_MS = 5_000;

export enum TriggerType {
  RainfallBelow = 0,
  VegetationIndexBelow = 1,
}

export enum PolicyStatus {
  Active = 0,
  PaidOut = 1,
  Expired = 2,
  Cancelled = 3,
}

export type Policy = {
  id: number;
  farmer: string;
  cropType: string;
  regionId: string;
  coverageAmount: string; // formatted ether, wei does not survive JSON
  triggerType: TriggerType;
  thresholdValue: number; // real units — divided by 100 (D7) before leaving this file
  toleranceValue: number;
  startDate: number;
  endDate: number;
  status: PolicyStatus;
  funded: boolean;
};

export type Reading = {
  policyId: number;
  oracle: string;
  value: number; // real units, same x100 -> /100 conversion as thresholdValue
  periodId: number;
  submittedAt: number;
};

let cache: { key: string; value: unknown; expires: number } | null = null;

const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const deployment = loadDeployment();

export const isConfigured = () => deployment !== null;

export function contractInfo() {
  return deployment
    ? { address: deployment.address, chainId: deployment.chainId, network: deployment.network }
    : null;
}

let networkCheckCache: { chainId: number; checkedAt: number } | null = null;
const NETWORK_CHECK_TTL_MS = 60_000;

/**
 * Refuses to proceed if BLOCKCHAIN_NETWORK's declared intent doesn't match
 * what the RPC endpoint actually reports — the safety net for a stale or
 * copy-pasted-wrong RPC_URL. Called before every oracle write (never
 * before a read — reads are harmless regardless of which chain they hit).
 * Cheap after the first call: the live chain ID a provider is connected to
 * cannot change mid-process, so this is cached rather than re-queried
 * every submission.
 */
export async function assertNetworkMatchesConfig(): Promise<void> {
  if (!networkCheckCache || Date.now() - networkCheckCache.checkedAt > NETWORK_CHECK_TTL_MS) {
    const network = await provider.getNetwork();
    networkCheckCache = { chainId: Number(network.chainId), checkedAt: Date.now() };
  }
  const actualChainId = networkCheckCache.chainId;

  if (config.blockchainNetwork === "sepolia" && actualChainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `BLOCKCHAIN_NETWORK=sepolia but RPC_URL is connected to chain ${actualChainId}, not Sepolia (${SEPOLIA_CHAIN_ID}). ` +
        `Refusing to submit — check RPC_URL in backend/.env.`
    );
  }
  if (config.blockchainNetwork === "local" && actualChainId === SEPOLIA_CHAIN_ID) {
    throw new Error(
      `BLOCKCHAIN_NETWORK=local but RPC_URL is connected to Sepolia (chain ${SEPOLIA_CHAIN_ID}). ` +
        `Refusing to submit — this would send real testnet transactions from a config believed to be local-only. ` +
        `Set BLOCKCHAIN_NETWORK=sepolia in backend/.env if this is intentional.`
    );
  }
}

function contract() {
  if (!deployment) {
    throw new Error(
      "No deployment found. Run `npm run deploy:local` in the contracts workspace first."
    );
  }
  return new ethers.Contract(deployment.address, deployment.abi as ethers.InterfaceAbi, provider);
}

/** Undoes the on-chain x100 scale (D7) — a scaled integer never leaves this file. */
const unscale = (raw: bigint) => Number(raw) / 100;

function toPolicy(raw: any): Policy {
  return {
    id: Number(raw.id),
    farmer: raw.farmer,
    cropType: raw.cropType,
    regionId: raw.regionId,
    coverageAmount: ethers.formatEther(raw.coverageAmount),
    triggerType: Number(raw.triggerType) as TriggerType,
    thresholdValue: unscale(raw.thresholdValue),
    toleranceValue: unscale(raw.toleranceValue),
    startDate: Number(raw.startDate),
    endDate: Number(raw.endDate),
    status: Number(raw.status) as PolicyStatus,
    funded: raw.funded,
  };
}

function toReading(raw: any): Reading {
  return {
    policyId: Number(raw.policyId),
    oracle: raw.oracle,
    value: unscale(raw.value),
    periodId: Number(raw.periodId),
    submittedAt: Number(raw.submittedAt),
  };
}

/** Short TTL cache: a demo refreshing on an interval shouldn't hammer the RPC. */
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (cache && cache.key === key && cache.expires > Date.now()) return cache.value as T;
  const value = await fn();
  cache = { key, value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function getPolicy(id: number): Promise<Policy> {
  return cached(`policy:${id}`, async () => toPolicy(await contract().getPolicy(id)));
}

export async function getPolicyCount(): Promise<number> {
  return cached("policyCount", async () => Number(await contract().getPolicyCount()));
}

export async function getReadings(policyId: number, periodId: number): Promise<Reading[]> {
  return cached(`readings:${policyId}:${periodId}`, async () => {
    const raw = await contract().getReadings(policyId, periodId);
    return raw.map(toReading);
  });
}

export async function isRegisteredOracle(address: string): Promise<boolean> {
  return cached(`oracle:${address}`, async () => contract().isRegisteredOracle(address));
}

export async function getOracleList(): Promise<string[]> {
  return cached("oracleList", async () => {
    const count = Number(await contract().oracleCount());
    // oracleList is a public array with no bulk getter — read by index.
    const addresses = await Promise.all(
      Array.from({ length: count }, (_, i) => contract().oracleList(i))
    );
    return addresses;
  });
}

/**
 * Lists policies 1..count. Sequential IDs (T1.4) make this a simple range
 * scan rather than needing an index — fine at hackathon scale.
 */
export async function listPolicies(offset: number, limit: number): Promise<Policy[]> {
  const count = await getPolicyCount();
  const start = Math.max(1, offset + 1);
  const end = Math.min(count, offset + limit);
  if (start > end) return [];

  const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return Promise.all(ids.map(getPolicy));
}

export async function getChainStatus() {
  const [blockNumber, network] = await Promise.all([
    provider.getBlockNumber(),
    provider.getNetwork(),
  ]);
  return { blockNumber, chainId: Number(network.chainId), rpcUrl: config.rpcUrl };
}

export type PolicyEvent = {
  name: string; // PolicyCreated, PolicyFunded, ReadingSubmitted, ConsensusReached,
  // ConsensusFailed, PayoutTriggered, PayoutRejected, PolicyCancelled
  blockNumber: number;
  blockTimestamp: number; // unix seconds — not every event carries its own timestamp in args (e.g. PayoutTriggered), so this is the one reliable source explain.ts can render a date from
  txHash: string;
  args: Record<string, unknown>; // raw event args, ×100-scaled values NOT yet unscaled — explain.ts does that at render time so it can label which field is which
};

const POLICY_SCOPED_EVENTS = [
  "PolicyCreated",
  "PolicyFunded",
  "ReadingSubmitted",
  "ConsensusReached",
  "ConsensusFailed",
  "PayoutTriggered",
  "PayoutRejected",
  "PolicyCancelled",
] as const;

/**
 * The real ledger (D11) — every terminating branch of evaluation emits an
 * event, so this is reconstructible from logs alone. policyId is indexed
 * on every one of these events (Schema.md), making this a filtered query
 * rather than a full chain scan.
 */
export async function getPolicyEvents(policyId: number): Promise<PolicyEvent[]> {
  const c = contract();
  const perEvent = await Promise.all(
    POLICY_SCOPED_EVENTS.map(async (name) => {
      const filter = c.filters[name](policyId);
      const logs = await c.queryFilter(filter);
      return logs.map((log) => {
        const parsed = "args" in log ? log : c.interface.parseLog(log);
        const args: Record<string, unknown> = {};
        if (parsed && "args" in parsed && parsed.args) {
          const fragment = c.interface.getEvent(name);
          fragment?.inputs.forEach((input, i) => {
            args[input.name] = (parsed.args as any)[i];
          });
        }
        return { name, blockNumber: log.blockNumber, txHash: log.transactionHash, args };
      });
    })
  );

  const flat = perEvent.flat().sort((a, b) => a.blockNumber - b.blockNumber);

  // One getBlock per unique block, not per event — several events (e.g.
  // ConsensusReached + PayoutTriggered) usually land in the same block.
  const uniqueBlocks = [...new Set(flat.map((e) => e.blockNumber))];
  const timestamps = new Map<number, number>();
  await Promise.all(
    uniqueBlocks.map(async (blockNumber) => {
      const block = await provider.getBlock(blockNumber);
      timestamps.set(blockNumber, block?.timestamp ?? 0);
    })
  );

  return flat.map((e) => ({
    ...e,
    blockTimestamp: timestamps.get(e.blockNumber) ?? 0,
  }));
}
