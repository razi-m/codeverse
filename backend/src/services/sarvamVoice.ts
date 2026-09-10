import { config } from "../config.js";

/**
 * Thin client for Sarvam AI's Text-to-Speech REST API —
 * https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/rest-api.
 * Separate from sarvam.ts (translation) and translate.ts (ledger i18n) —
 * this module only turns already-decided text into speech audio, same
 * D17 boundary: it never generates new payout reasoning, only speaks
 * text handed to it.
 *
 * Real external network call: errors are surfaced via SarvamVoiceError,
 * never papered over with silence or a fabricated audio buffer.
 */

const TTS_URL = "https://api.sarvam.ai/text-to-speech";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_TEXT_LENGTH = 1500; // stays under bulbul:v2/v3's 1500-2500 char limits with margin

export type VoiceLanguage = "en" | "hi" | "mr";

const LANGUAGE_CODES: Record<VoiceLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

export class SarvamVoiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SarvamVoiceError";
  }
}

export function isSarvamVoiceConfigured(): boolean {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}

/**
 * Synthesizes speech for the given text/language, returning raw WAV bytes
 * (Sarvam returns base64-encoded audio in a JSON envelope; this decodes it
 * so callers never handle base64 themselves). Throws SarvamVoiceError on
 * missing config, timeout, network failure, or a malformed response.
 */
export async function synthesizeSpeech(text: string, language: VoiceLanguage): Promise<Buffer> {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw new SarvamVoiceError("SARVAM_API_KEY is not configured");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new SarvamVoiceError(
      `Text is ${text.length} characters, exceeds the ${MAX_TEXT_LENGTH}-character limit for a single TTS call`
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(TTS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        text,
        target_language_code: LANGUAGE_CODES[language],
        speaker: config.sarvamVoiceSpeaker,
        model: "bulbul:v2",
        audio_format: "wav",
      }),
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new SarvamVoiceError(`Sarvam TTS request timed out after ${FETCH_TIMEOUT_MS}ms`, err);
    }
    throw new SarvamVoiceError(`Sarvam TTS request failed: ${err?.message ?? err}`, err);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // best-effort only
    }
    throw new SarvamVoiceError(`Sarvam TTS returned ${response.status}: ${body || response.statusText}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new SarvamVoiceError("Sarvam TTS response was not valid JSON", err);
  }

  const audios = (json as any)?.audios;
  if (!Array.isArray(audios) || typeof audios[0] !== "string" || audios[0].length === 0) {
    throw new SarvamVoiceError("Sarvam TTS response missing expected audios[0] field");
  }

  return Buffer.from(audios[0], "base64");
}
