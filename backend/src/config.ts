import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export type Deployment = {
  address: string;
  chainId: number;
  network: string;
  deployedAt: string;
  deployTxHash?: string | null;
  deployBlockNumber?: number | null;
  abi: unknown[];
};

// Sepolia's well-known chain ID — used only to sanity-check that
// BLOCKCHAIN_NETWORK=sepolia is actually talking to Sepolia (see
// services/insurance.ts's assertNetworkMatchesConfig, called before any
// oracle write). Not used to select behaviour on its own.
export const SEPOLIA_CHAIN_ID = 11155111;

/**
 * deployment.json is written by contracts/scripts/deploy.js. It is absent until
 * the first deploy, so we degrade gracefully instead of crashing on boot.
 */
export function loadDeployment(): Deployment | null {
  const file = path.join(dir, "deployment.json");
  if (!fs.existsSync(file)) return null;

  const deployment = JSON.parse(fs.readFileSync(file, "utf8")) as Deployment;
  const override = process.env.CONTRACT_ADDRESS?.trim();
  if (override) deployment.address = override;
  return deployment;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  // Supabase is strictly non-authoritative (D1) — both may be unset, in
  // which case services/supabase.ts degrades every query to null.
  supabaseUrl: process.env.SUPABASE_URL?.trim() || null,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY?.trim() || null,
  // Service-role key: the one deliberate exception to the anon-only model
  // above. Used only by services/supabaseAdmin.ts to reach app_users and
  // policy_assignments, which carry no anon RLS policy at all because
  // they ARE the authorization boundary (unlike every other table, which
  // is presentational and safe to leave anon-readable per D20/D1). Never
  // read anywhere else, never sent to the frontend.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
  // Selects which WeatherSource the oracle harness uses (P9). "simulated"
  // (default) keeps the deterministic Supabase-backed scenarios used for
  // judging; "open-meteo" fetches real live rainfall; "sentinel" fetches
  // real live NDVI. Business logic never branches on this directly — see
  // services/weatherSourceFactory.ts.
  weatherSource: (process.env.WEATHER_SOURCE?.trim() || "simulated") as
    | "simulated"
    | "open-meteo"
    | "sentinel",
  // Declared intent, not derived — "local" (default) or "sepolia". Used
  // only as a safety check against the RPC endpoint's actual chain ID
  // before any oracle write (services/insurance.ts), so a stale/wrong
  // RPC_URL fails loudly instead of quietly writing to the wrong chain.
  // Does not itself select RPC_URL/CONTRACT_ADDRESS — those still come
  // from their own env vars, same as before this existed.
  blockchainNetwork: (process.env.BLOCKCHAIN_NETWORK?.trim().toLowerCase() || "local") as
    | "local"
    | "sepolia",
  // Twilio (WhatsApp/SMS payout notifications). All optional — absent
  // means notifications are skipped with a clear SKIPPED status, never
  // faked as sent. Never exposed to the frontend, never logged.
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || null,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN?.trim() || null,
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM?.trim() || null,
  twilioSmsFrom: process.env.TWILIO_SMS_FROM?.trim() || null,
  // The one fixed number POST /api/notifications/test-whatsapp is allowed
  // to send to — never an arbitrary caller-supplied destination.
  notificationTestRecipient: process.env.NOTIFICATION_TEST_RECIPIENT?.trim() || null,
  // Voice calls (routes/voiceCall.ts). TWILIO_VOICE_FROM is a real
  // Voice-capable Twilio number (may be the same number as
  // TWILIO_WHATSAPP_FROM — Twilio numbers can carry multiple
  // capabilities). SARVAM_VOICE_SPEAKER picks the TTS voice; Sarvam's own
  // default ("shubh") is used if unset.
  twilioVoiceFrom: process.env.TWILIO_VOICE_FROM?.trim() || null,
  sarvamVoiceSpeaker: process.env.SARVAM_VOICE_SPEAKER?.trim() || "shubh",
  // A public HTTPS URL (e.g. an ngrok tunnel in dev) that reaches this
  // backend — required because Twilio's servers fetch TwiML/audio from
  // this process over the public internet; they can never reach
  // localhost. Absent in prod-behind-a-real-domain setups only if that
  // domain is set here instead.
  publicBaseUrl: process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, "") || null,
};
