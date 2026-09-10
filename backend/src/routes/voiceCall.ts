import { Router } from "express";
import twilioLib from "twilio";
import { config } from "../config.js";
import { isSarvamVoiceConfigured, synthesizeSpeech, type VoiceLanguage } from "../services/sarvamVoice.js";

export const voiceCallRouter = Router();

/**
 * In-memory store of pending call scripts, keyed by a random call token.
 * A real phone call is short-lived (minutes) and this process is the only
 * consumer of these tokens, so an in-memory Map is the right scope — no
 * need for Supabase persistence, and nothing here survives (or needs to
 * survive) a backend restart. Entries are deleted once played or after
 * TTL, so this can never grow unbounded.
 */
const pendingScripts = new Map<string, { text: string; language: VoiceLanguage; createdAt: number }>();
const SCRIPT_TTL_MS = 10 * 60 * 1000;

function pruneExpired() {
  const now = Date.now();
  for (const [token, entry] of pendingScripts) {
    if (now - entry.createdAt > SCRIPT_TTL_MS) pendingScripts.delete(token);
  }
}

function publicBaseUrl(): string | null {
  return config.publicBaseUrl;
}

export function isVoiceCallConfigured(): boolean {
  return Boolean(
    config.twilioAccountSid &&
      config.twilioAuthToken &&
      config.twilioVoiceFrom &&
      isSarvamVoiceConfigured() &&
      publicBaseUrl()
  );
}

/**
 * Places a real outbound call that speaks `text` (in `language`) to `to`.
 * Twilio can only fetch TwiML from a publicly reachable URL — never
 * localhost — so PUBLIC_BASE_URL (an ngrok/tunnel URL in dev, a real
 * domain in production) must be configured. Throws with a clear reason
 * on any missing prerequisite; never silently no-ops.
 */
export async function placeVoiceCall(
  to: string,
  text: string,
  language: VoiceLanguage
): Promise<{ sid: string; status: string }> {
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing)");
  }
  if (!config.twilioVoiceFrom) {
    throw new Error("TWILIO_VOICE_FROM is not configured");
  }
  const base = publicBaseUrl();
  if (!base) {
    throw new Error(
      "PUBLIC_BASE_URL is not configured — Twilio needs a public HTTPS URL to fetch call instructions " +
        "(e.g. an ngrok tunnel in development). Voice calls cannot be placed without it."
    );
  }
  if (!isSarvamVoiceConfigured()) {
    throw new Error("SARVAM_API_KEY is not configured — cannot synthesize the call script");
  }

  pruneExpired();
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  pendingScripts.set(token, { text, language, createdAt: Date.now() });

  const client = twilioLib(config.twilioAccountSid, config.twilioAuthToken);
  const call = await client.calls.create({
    from: config.twilioVoiceFrom,
    to,
    url: `${base}/api/voice/twiml/${token}`,
    method: "GET",
  });

  return { sid: call.sid, status: call.status };
}

/**
 * GET /api/voice/twiml/:token — Twilio calls this the moment the call is
 * answered. Returns TwiML that plays the synthesized audio, served from
 * the audio route below. Unauthenticated by necessity: Twilio's servers
 * call this directly, they cannot carry our session auth.
 */
voiceCallRouter.get("/twiml/:token", (req, res) => {
  const entry = pendingScripts.get(req.params.token);
  const VoiceResponse = twilioLib.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (!entry) {
    twiml.say({ voice: "alice" }, "Sorry, this call script has expired.");
    res.type("text/xml").send(twiml.toString());
    return;
  }

  const base = publicBaseUrl();
  twiml.play(`${base}/api/voice/audio/${req.params.token}`);
  res.type("text/xml").send(twiml.toString());
});

/**
 * GET /api/voice/audio/:token — fetched by Twilio's media servers (per the
 * <Play> verb above) immediately after /twiml/:token responds. Synthesizes
 * on first fetch and serves raw WAV bytes. The script is consumed (deleted)
 * only after a successful synthesis, not on request receipt, so a
 * transient Sarvam failure can be retried by Twilio's own re-fetch.
 */
voiceCallRouter.get("/audio/:token", async (req, res) => {
  const entry = pendingScripts.get(req.params.token);
  if (!entry) {
    res.status(404).end();
    return;
  }

  try {
    const audio = await synthesizeSpeech(entry.text, entry.language);
    pendingScripts.delete(req.params.token);
    res.type("audio/wav").send(audio);
  } catch (err) {
    console.error("[voiceCall] speech synthesis failed:", err instanceof Error ? err.message : err);
    res.status(502).end();
  }
});
