/**
 * Thin client for Sarvam AI's translation API —
 * https://docs.sarvam.ai/api-reference/text/translate-text. Used to
 * translate the farmer ledger into Hindi/Marathi (P9). This is a real
 * external network call: errors are surfaced, never papered over with
 * fabricated or silently-English-fallback text at this layer (the caller
 * decides whether to fall back — see translate.ts).
 *
 * D17 still holds: this translates explain.ts's already-deterministic
 * English sentence into another language. It never generates new payout
 * reasoning — the decision text itself is fixed before this is called.
 */

const TRANSLATE_URL = "https://api.sarvam.ai/translate";
const FETCH_TIMEOUT_MS = 8_000;

export type SupportedLanguage = "hi" | "mr";

const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  hi: "hi-IN",
  mr: "mr-IN",
};

export class SarvamError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SarvamError";
  }
}

/**
 * Translates one string of English farmer-facing text into the given
 * language. Throws SarvamError on missing config, timeout, network
 * failure, or a non-OK/malformed response — never returns a fabricated
 * translation.
 */
export async function translateText(text: string, target: SupportedLanguage): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw new SarvamError("SARVAM_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(TRANSLATE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: "en-IN",
        target_language_code: LANGUAGE_CODES[target],
      }),
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new SarvamError(`Sarvam request timed out after ${FETCH_TIMEOUT_MS}ms`, err);
    }
    throw new SarvamError(`Sarvam request failed: ${err?.message ?? err}`, err);
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
    throw new SarvamError(`Sarvam returned ${response.status}: ${body || response.statusText}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new SarvamError("Sarvam response was not valid JSON", err);
  }

  const translated = (json as any)?.translated_text;
  if (typeof translated !== "string" || translated.length === 0) {
    throw new SarvamError("Sarvam response missing expected translated_text field");
  }

  return translated;
}

export function isSarvamConfigured(): boolean {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}
