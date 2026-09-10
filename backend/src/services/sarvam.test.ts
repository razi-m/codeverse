import { test } from "node:test";
import assert from "node:assert/strict";
import { translateText, isSarvamConfigured, SarvamError } from "./sarvam.js";

const ORIGINAL_KEY = process.env.SARVAM_API_KEY;

function withApiKey<T>(value: string | undefined, fn: () => T): T {
  if (value === undefined) delete process.env.SARVAM_API_KEY;
  else process.env.SARVAM_API_KEY = value;
  try {
    return fn();
  } finally {
    if (ORIGINAL_KEY === undefined) delete process.env.SARVAM_API_KEY;
    else process.env.SARVAM_API_KEY = ORIGINAL_KEY;
  }
}

function mockFetch(handler: (url: string, init: any) => { status: number; body: unknown } | "timeout" | "network-error") {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    const result = handler(url, init);
    if (result === "network-error") throw new TypeError("fetch failed");
    if (result === "timeout") {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }
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

test("throws SarvamError when SARVAM_API_KEY is unset, never fabricates a translation", async () => {
  await withApiKey(undefined, async () => {
    await assert.rejects(() => translateText("hello", "hi"), SarvamError);
  });
});

test("isSarvamConfigured reflects whether the key is set", () => {
  withApiKey("test-key", () => assert.equal(isSarvamConfigured(), true));
  withApiKey(undefined, () => assert.equal(isSarvamConfigured(), false));
});

test("sends the correct request shape and returns translated_text", async () => {
  const restore = mockFetch((url, init) => {
    assert.equal(url, "https://api.sarvam.ai/translate");
    assert.equal(init.headers["api-subscription-key"], "test-key");
    const body = JSON.parse(init.body);
    assert.equal(body.input, "Hello");
    assert.equal(body.source_language_code, "en-IN");
    assert.equal(body.target_language_code, "hi-IN");
    return { status: 200, body: { request_id: "x", translated_text: "नमस्ते", source_language_code: "en-IN" } };
  });
  try {
    await withApiKey("test-key", async () => {
      const result = await translateText("Hello", "hi");
      assert.equal(result, "नमस्ते");
    });
  } finally {
    restore();
  }
});

test("targets mr-IN for Marathi", async () => {
  const restore = mockFetch((_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.target_language_code, "mr-IN");
    return { status: 200, body: { translated_text: "मराठी" } };
  });
  try {
    await withApiKey("test-key", () => translateText("test", "mr"));
  } finally {
    restore();
  }
});

test("non-OK response throws SarvamError", async () => {
  const restore = mockFetch(() => ({ status: 401, body: { detail: "invalid key" } }));
  try {
    await withApiKey("bad-key", async () => {
      await assert.rejects(() => translateText("hello", "hi"), SarvamError);
    });
  } finally {
    restore();
  }
});

test("malformed response (missing translated_text) throws SarvamError", async () => {
  const restore = mockFetch(() => ({ status: 200, body: { request_id: "x" } }));
  try {
    await withApiKey("test-key", async () => {
      await assert.rejects(() => translateText("hello", "hi"), SarvamError);
    });
  } finally {
    restore();
  }
});

test("network failure throws SarvamError, not a silent fallback", async () => {
  const restore = mockFetch(() => "network-error");
  try {
    await withApiKey("test-key", async () => {
      await assert.rejects(() => translateText("hello", "hi"), SarvamError);
    });
  } finally {
    restore();
  }
});

test("timeout throws SarvamError mentioning the timeout", async () => {
  const restore = mockFetch(() => "timeout");
  try {
    await withApiKey("test-key", async () => {
      await assert.rejects(
        () => translateText("hello", "hi"),
        (err: unknown) => err instanceof SarvamError && /timed out/i.test(err.message)
      );
    });
  } finally {
    restore();
  }
});
