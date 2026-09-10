import { test } from "node:test";
import assert from "node:assert/strict";
import { translateLedger, isSupportedLanguage } from "./translate.js";
import type { LedgerEntry } from "./explain.js";

/**
 * backend/.env configures real Supabase credentials, so supabase.ts's
 * client is live in this test process too — the fetch mock below only
 * intercepts calls to Sarvam's host and passes everything else (including
 * Supabase's own requests) through to the real global fetch, so these
 * tests exercise the real cache read/write path rather than accidentally
 * degrading it. mockFetch restores the original fetch afterward either way.
 *
 * Tests that actually reach the cache use policyId 999999 (not a real
 * demo policy) so leftover claim_explanations rows never collide with the
 * seeded demo data — that table is explicitly "safe to truncate at any
 * time" (docs/Schema.md), so leftover test rows are harmless either way.
 */

const ORIGINAL_KEY = process.env.SARVAM_API_KEY;

function withApiKey<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (value === undefined) delete process.env.SARVAM_API_KEY;
  else process.env.SARVAM_API_KEY = value;
  return fn().finally(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.SARVAM_API_KEY;
    else process.env.SARVAM_API_KEY = ORIGINAL_KEY;
  });
}

function mockFetch(handler: (body: any) => { status: number; body: unknown } | "network-error") {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.includes("api.sarvam.ai")) {
      return original(input, init);
    }
    const body = JSON.parse(init.body);
    const result = handler(body);
    if (result === "network-error") throw new TypeError("fetch failed");
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      statusText: String(result.status),
      json: async () => result.body,
      text: async () => JSON.stringify(result.body),
    } as unknown as Response;
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    eventName: "PayoutRejected",
    txHash: "0x" + "ab".repeat(32),
    blockNumber: 10,
    timestamp: 1_723_593_600,
    text: "Rainfall was 30mm — above your 20mm threshold, so no payout was due.",
    ...overrides,
  };
}

test("isSupportedLanguage accepts hi/mr, rejects anything else", () => {
  assert.equal(isSupportedLanguage("hi"), true);
  assert.equal(isSupportedLanguage("mr"), true);
  assert.equal(isSupportedLanguage("en"), false);
  assert.equal(isSupportedLanguage("te"), false);
  assert.equal(isSupportedLanguage(null), false);
  assert.equal(isSupportedLanguage(undefined), false);
});

test("language 'en' or unset returns the original English text, no network call", async () => {
  const restore = mockFetch(() => {
    throw new Error("must not call Sarvam for English");
  });
  try {
    const e = entry();
    const resultEn = await translateLedger(1, e.text, [e], "en");
    assert.equal(resultEn.language, "en");
    assert.equal(resultEn.ledger[0].text, e.text);

    const resultUnset = await translateLedger(1, e.text, [e], null);
    assert.equal(resultUnset.language, "en");
  } finally {
    restore();
  }
});

test("an unsupported language code (e.g. 'te') falls back to English untranslated", async () => {
  const restore = mockFetch(() => {
    throw new Error("must not call Sarvam for an unsupported language");
  });
  try {
    const e = entry();
    const result = await translateLedger(1, e.text, [e], "te");
    assert.equal(result.language, "en");
    assert.equal(result.ledger[0].text, e.text);
  } finally {
    restore();
  }
});

test("missing SARVAM_API_KEY degrades to English rather than throwing", async () => {
  await withApiKey(undefined, async () => {
    const e = entry();
    const result = await translateLedger(999999, e.text, [e], "hi");
    assert.equal(result.language, "en");
    assert.equal(result.ledger[0].text, e.text);
  });
});

test("translates each ledger entry and the summary when a supported language is requested", async () => {
  const restore = mockFetch((body) => ({
    status: 200,
    body: { translated_text: `[hi] ${body.input}` },
  }));
  try {
    await withApiKey("test-key", async () => {
      const e = entry();
      const result = await translateLedger(999999, e.text, [e], "hi");
      assert.equal(result.language, "hi");
      assert.equal(result.ledger[0].text, `[hi] ${e.text}`);
      // summary === the single entry's text here, so it reuses the translated entry rather than a second call
      assert.equal(result.summary, `[hi] ${e.text}`);
    });
  } finally {
    restore();
  }
});

test("a Sarvam failure on one entry falls back to English for that entry, marked translationFailed, without breaking the rest", async () => {
  let call = 0;
  const restore = mockFetch((body) => {
    call++;
    if (body.input.includes("fails")) return { status: 500, body: { detail: "server error" } };
    return { status: 200, body: { translated_text: `[hi] ${body.input}` } };
  });
  try {
    await withApiKey("test-key", async () => {
      const ok = entry({ txHash: "0x" + "11".repeat(32), text: "This one works." });
      const bad = entry({ txHash: "0x" + "22".repeat(32), text: "This one fails." });
      const result = await translateLedger(999999, "summary text", [ok, bad], "hi");
      assert.equal(result.ledger[0].text, "[hi] This one works.");
      assert.equal(result.ledger[1].text, "This one fails."); // English fallback
      assert.equal(result.ledger[1].translationFailed, true);
    });
  } finally {
    restore();
  }
  assert.ok(call >= 2);
});

test("translates a distinct summary line separately from the ledger entries when they differ", async () => {
  const restore = mockFetch((body) => ({ status: 200, body: { translated_text: `[hi] ${body.input}` } }));
  try {
    await withApiKey("test-key", async () => {
      // Distinct txHash from other tests sharing policyId 999999 — otherwise
      // this hits another test's cached row for the default entry() txHash
      // instead of exercising a fresh Sarvam call.
      const e = entry({ txHash: "0x" + "33".repeat(32), text: "An entry sentence." });
      const result = await translateLedger(999999, "A different summary sentence.", [e], "hi");
      assert.equal(result.ledger[0].text, "[hi] An entry sentence.");
      assert.equal(result.summary, "[hi] A different summary sentence.");
    });
  } finally {
    restore();
  }
});
