const BASE = import.meta.env.VITE_API_URL ?? "/api";

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
  regionDisplayName: string;
  coverageAmount: string; // formatted ether — the backend already scaled this to a real number
  triggerType: TriggerType;
  thresholdValue: number; // real units, e.g. mm
  toleranceValue: number;
  startDate: number;
  endDate: number;
  status: PolicyStatus;
  funded: boolean;
};

export type LedgerEntry = {
  eventName: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  text: string;
};

export type PolicyLedger = {
  policyId: number;
  summary: string;
  ledger: LedgerEntry[];
};

export type VerifyEvent = {
  name: string;
  blockNumber: number;
  txHash: string;
  args: Record<string, unknown>;
};

export type PolicyVerify = {
  policyId: number;
  contract: { address: string; chainId: number; network: string } | null;
  events: VerifyEvent[];
};

export type HealthStatus = {
  ok: boolean;
  contract: { address: string; chainId: number; network: string } | null;
  chain: { blockNumber: number; chainId: number; rpcUrl: string } | null;
  oracles: { registeredCount: number | null };
  supabase: { configured: boolean; reachable: boolean };
};

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetchPolicies = (offset = 0, limit = 20) =>
  request<{ policies: Policy[]; total: number }>(`/policies?offset=${offset}&limit=${limit}`);

export const fetchPolicy = (id: number) => request<Policy>(`/policies/${id}`);

export const fetchLedger = (id: number) => request<PolicyLedger>(`/policies/${id}/ledger`);

export const fetchVerify = (id: number) => request<PolicyVerify>(`/policies/${id}/verify`);

export const fetchHealth = () => request<HealthStatus>("/health");
