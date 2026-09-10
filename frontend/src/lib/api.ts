import { supabase } from "./supabaseClient.js";

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
  /** Plot size from Supabase metadata; null when unavailable (non-authoritative, D1). */
  areaAcres: number | null;
  /** From the backend's regionRegistry; null when the region has no mapping. */
  coordinates: { latitude: number; longitude: number } | null;
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
  language: string; // "en" unless a supported ?lang= was requested and served
};

export type LanguageCode = "en" | "hi" | "mr";

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
  weatherSource?: string;
};

/** Live rainfall inspection payload — GET /api/weather (P9, read-only, no chain effect). */
export type WeatherReadout = {
  source: string;
  latitude: number;
  longitude: number;
  startDate: string | null;
  endDate: string | null;
  daily: { date: string; precipitationMm: number | null }[];
  cumulativeMm: number;
  daysWithData: number;
  daysRequested: number;
  fetchedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetchPolicies = (offset = 0, limit = 20) =>
  request<{ policies: Policy[]; total: number }>(`/policies?offset=${offset}&limit=${limit}`);

export const fetchPolicy = (id: number) => request<Policy>(`/policies/${id}`);

export const fetchLedger = (id: number, lang: LanguageCode = "en") =>
  request<PolicyLedger>(`/policies/${id}/ledger${lang === "en" ? "" : `?lang=${lang}`}`);

export const fetchVerify = (id: number) => request<PolicyVerify>(`/policies/${id}/verify`);

export const fetchHealth = () => request<HealthStatus>("/health");

export const fetchWeather = (lat: number, lon: number, days = 14) =>
  request<WeatherReadout>(`/weather?lat=${lat}&lon=${lon}&days=${days}`);

/** Links the just-authenticated Supabase user to a farmers row — call once right after login. */
export const linkFarmer = () =>
  request<{ farmerId: string; linked: boolean }>("/auth/link-farmer", { method: "POST" });

export const fetchMe = () => request<{ authenticated: boolean; role: string | null }>("/auth/me");

/** Sets the farmer's own WhatsApp payout-alert number and opt-in. */
export const setWhatsappPreference = (whatsappNumber: string | null, optIn: boolean) =>
  request<{ whatsappNumber: string | null; optIn: boolean }>("/farmer/whatsapp", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ whatsappNumber, optIn }),
  });

export type NotificationHealth = {
  twilioConfigured: boolean;
  whatsappConfigured: boolean;
  smsConfigured: boolean;
  voiceConfigured: boolean;
};

export const fetchNotificationHealth = () => request<NotificationHealth>("/notifications/health");

/** Insurer/admin only. Sends only to the fixed NOTIFICATION_TEST_RECIPIENT configured server-side. */
export const sendTestWhatsapp = () =>
  request<{ success: boolean; status: string; providerMessageId: string }>(
    "/notifications/test-whatsapp",
    { method: "POST" }
  );

/** Insurer/admin only. Places a real call to the fixed NOTIFICATION_TEST_RECIPIENT configured server-side. */
export const sendTestVoiceCall = (language: "en" | "hi" | "mr") =>
  request<{ success: boolean; status: string; providerCallSid: string }>(
    "/notifications/test-voice-call",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ language }) }
  );
