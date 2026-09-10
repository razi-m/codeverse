import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

/**
 * Off-chain, non-authoritative data only (D1). Every query here degrades to
 * null on any failure — missing config, network error, or Supabase being
 * down entirely — rather than throwing. The payout path must work with
 * Supabase unreachable (verified at T2.10); this file is what makes that
 * true rather than aspirational.
 */

export type Farmer = {
  id: string;
  wallet_address: string;
  full_name: string;
  phone: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  preferred_language: string;
};

export type PolicyMetadata = {
  id: string;
  policy_id: number;
  region_display_name: string | null;
  plot_description: string | null;
  area_acres: number | null;
  sowing_date: string | null;
  notes: string | null;
};

export type WeatherFeedRow = {
  id: string;
  region_id: string;
  source_key: "feed_a" | "feed_b";
  period_id: number;
  observed_value: number; // real units (mm), not scaled
  measurement_type: "rainfall" | "ndvi";
  observed_at: string;
  scenario: "baseline" | "drought" | "disagreement";
};

export type OracleSource = {
  id: string;
  source_key: string;
  wallet_address: string;
  display_name: string;
  provider_type: string | null;
  is_active: boolean;
};

export type ClaimExplanation = {
  id: string;
  policy_id: number;
  period_id: number | null;
  event_type: string;
  tx_hash: string | null;
  block_number: number | null;
  language: string;
  explanation_text: string;
  created_at: string;
};

const client: SupabaseClient | null =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;

export const isSupabaseConfigured = () => client !== null;

/** Wraps every query so a network failure or missing config never throws. */
async function safe<T>(
  fn: (db: SupabaseClient) => PromiseLike<{ data: T | null; error: unknown }>
): Promise<T | null> {
  if (!client) return null;
  try {
    const { data, error } = await fn(client);
    if (error) {
      console.error("[supabase] query failed:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[supabase] unreachable:", err);
    return null;
  }
}

export async function getFarmerByWallet(walletAddress: string): Promise<Farmer | null> {
  return safe<Farmer>((db) =>
    db.from("farmers").select("*").ilike("wallet_address", walletAddress).maybeSingle()
  );
}

export async function getPolicyMetadata(policyId: number): Promise<PolicyMetadata | null> {
  return safe<PolicyMetadata>((db) =>
    db.from("policy_metadata").select("*").eq("policy_id", policyId).maybeSingle()
  );
}

export async function getWeatherFeed(
  regionId: string,
  periodId: number,
  scenario: string
): Promise<WeatherFeedRow[] | null> {
  return safe<WeatherFeedRow[]>((db) =>
    db
      .from("weather_feed")
      .select("*")
      .eq("region_id", regionId)
      .eq("period_id", periodId)
      .eq("scenario", scenario)
      .order("source_key")
  );
}

export async function getOracleSources(): Promise<OracleSource[] | null> {
  return safe<OracleSource[]>((db) => db.from("oracle_sources").select("*").order("source_key"));
}

export async function getClaimExplanations(policyId: number): Promise<ClaimExplanation[] | null> {
  return safe<ClaimExplanation[]>((db) =>
    db
      .from("claim_explanations")
      .select("*")
      .eq("policy_id", policyId)
      .order("created_at", { ascending: false })
  );
}

/** Same table, filtered to one language — the translation cache read path (P9). */
export async function getClaimExplanationsForLanguage(
  policyId: number,
  language: string
): Promise<ClaimExplanation[] | null> {
  return safe<ClaimExplanation[]>((db) =>
    db.from("claim_explanations").select("*").eq("policy_id", policyId).eq("language", language)
  );
}

/** Cache-only write — safe to fail silently, the ledger is regenerable from chain events (D11). */
export async function cacheExplanation(row: Omit<ClaimExplanation, "id" | "created_at">): Promise<void> {
  if (!client) return;
  try {
    const { error } = await client.from("claim_explanations").upsert(row, {
      onConflict: "policy_id,tx_hash,language",
    });
    if (error) console.error("[supabase] cacheExplanation failed:", error);
  } catch (err) {
    console.error("[supabase] cacheExplanation unreachable:", err);
  }
}
