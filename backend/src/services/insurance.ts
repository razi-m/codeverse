import { ethers } from "ethers";
import { config, loadDeployment } from "../config.js";

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
