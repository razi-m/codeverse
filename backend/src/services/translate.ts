import { translateText, isSarvamConfigured, SarvamError, type SupportedLanguage } from "./sarvam.js";
import { getClaimExplanationsForLanguage, cacheExplanation } from "./supabase.js";
import type { LedgerEntry } from "./explain.js";

export type { SupportedLanguage };

/**
 * i18n layer over explain.ts's output (P9) — wraps it, never bypasses it
 * (docs/ImplementationPlan.md § P9): explain.ts remains the single source
 * of the English decision text, generated the same deterministic way it
 * always was. This module only translates that already-fixed text.
 *
 * Every translation is cached in Supabase's claim_explanations table
 * (already had a `language` column reserved for exactly this, unused
 * until now) keyed by (policy_id, tx_hash, language) — a farmer's page
 * load never waits on a live Sarvam call after the first render, and a
 * cached translation survives a Sarvam outage. Supabase itself is
 * non-authoritative (D1): a cache miss or Supabase being down just means
 * a fresh translate call, not a broken page.
 *
 * English ("en") is passed straight through — no network call, and always
 * succeeds, so this layer can never make the ledger *less* available than
 * it already was.
 */

const SUPPORTED: readonly SupportedLanguage[] = ["hi", "mr"];

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return SUPPORTED.includes(value as SupportedLanguage);
}

/**
 * Translates one ledger entry's text, using the Supabase cache first, then
 * falling back to a live Sarvam call. On any failure — Sarvam
 * unconfigured, unreachable, or erroring — returns the original English
 * text with `translationFailed: true` rather than throwing, so the ledger
 * never breaks because a translation did.
 */
async function translateEntry(
  policyId: number,
  entry: LedgerEntry,
  language: SupportedLanguage
): Promise<LedgerEntry & { translationFailed?: boolean }> {
  const cached = await getClaimExplanationsForLanguage(policyId, language);
  const hit = cached?.find((row) => row.tx_hash === entry.txHash && row.event_type === entry.eventName);
  if (hit) {
    return { ...entry, text: hit.explanation_text };
  }

  try {
    const translated = await translateText(entry.text, language);
    // Cache write is best-effort (cacheExplanation already swallows its own
    // failures) — a caching failure must not affect what's returned here.
    void cacheExplanation({
      policy_id: policyId,
      period_id: null,
      event_type: entry.eventName,
      tx_hash: entry.txHash,
      block_number: entry.blockNumber,
      language,
      explanation_text: translated,
    });
    return { ...entry, text: translated };
  } catch (err) {
    const message = err instanceof SarvamError ? err.message : String(err);
    console.error(`[translate] falling back to English for policy ${policyId}, tx ${entry.txHash}: ${message}`);
    return { ...entry, translationFailed: true };
  }
}

/**
 * Translates a full ledger (and its summary line) into the given language.
 * `language: "en"` (or unset) returns the input unchanged, no network call.
 * Entries are translated sequentially — Sarvam has no documented batch
 * endpoint, and a demo-sized ledger (a handful of entries) makes this
 * negligible; parallelizing would only matter at a scale this product
 * doesn't operate at.
 */
export async function translateLedger(
  policyId: number,
  summary: string,
  ledger: LedgerEntry[],
  language: string | null | undefined
): Promise<{ summary: string; ledger: (LedgerEntry & { translationFailed?: boolean })[]; language: string }> {
  if (!isSupportedLanguage(language)) {
    return { summary, ledger, language: "en" };
  }
  if (!isSarvamConfigured()) {
    console.error(`[translate] SARVAM_API_KEY not set — serving English for requested language "${language}"`);
    return { summary, ledger, language: "en" };
  }

  const translatedEntries: (LedgerEntry & { translationFailed?: boolean })[] = [];
  for (const entry of ledger) {
    translatedEntries.push(await translateEntry(policyId, entry, language));
  }

  // The summary line reuses the most recent entry's already-translated text
  // when it matches (the common case — summarize() derives from the same
  // event) to avoid a redundant Sarvam call; otherwise translates directly.
  const lastEntry = ledger[ledger.length - 1];
  let translatedSummary = summary;
  if (lastEntry && lastEntry.text === summary) {
    translatedSummary = translatedEntries[translatedEntries.length - 1]?.text ?? summary;
  } else {
    try {
      translatedSummary = await translateText(summary, language);
    } catch (err) {
      const message = err instanceof SarvamError ? err.message : String(err);
      console.error(`[translate] summary translation failed for policy ${policyId}: ${message}`);
    }
  }

  return { summary: translatedSummary, ledger: translatedEntries, language };
}
