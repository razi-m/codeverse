import { test } from "node:test";
import assert from "node:assert/strict";
import { synthesizeSpeech, isSarvamVoiceConfigured, SarvamVoiceError } from "./sarvamVoice.js";

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

test("throws SarvamVoiceError when SARVAM_API_KEY is unset, never fabricates audio", async () => {
  await withApiKey(undefined, async () => {
    await assert.rejects(() => synthesizeSpeech("hello", "en"), SarvamVoiceError);
  });
});

test("isSarvamVoiceConfigured reflects whether the key is set", () => {
  withApiKey("test-key", () => assert.equal(isSarvamVoiceConfigured(), true));
  withApiKey(undefined, () => assert.equal(isSarvamVoiceConfigured(), false));
});

test("rejects text over the length limit before making a network call", async () => {
  await withApiKey("test-key", async () => {
    await assert.rejects(() => synthesizeSpeech("a".repeat(1501), "en"), SarvamVoiceError);
  });
});

test("sends the correct request shape and decodes base64 audio", async () => {
  const wavBytes = Buffer.from("RIFF....WAVEfmt ", "utf8");
  const restore = mockFetch((url, init) => {
    assert.equal(url, "https://api.sarvam.ai/text-to-speech");
    assert.equal(init.headers["api-subscription-key"], "test-key");
    const body = JSON.parse(init.body);
    assert.equal(body.text, "Hello");
    assert.equal(body.target_language_code, "en-IN");
    assert.equal(body.model, "bulbul:v2");
    return { status: 200, body: { request_id: "x", audios: [wavBytes.toString("base64")] } };
  });
  try {
    await withApiKey("test-key", async () => {
      const result = await synthesizeSpeech("Hello", "en");
      assert.deepEqual(result, wavBytes);
    });
  } finally {
    restore();
  }
});

test("targets hi-IN for Hindi", async () => {
  const restore = mockFetch((_url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.target_language_code, "hi-IN");
    return { status: 200, body: { audios: [Buffer.from("x").toString("base64")] } };
  });
  try {
    await withApiKey("test-key", () => synthesizeSpeech("test", "hi"));
  } finally {
    restore();
  }
});

test("non-OK response throws SarvamVoiceError", async () => {
  const restore = mockFetch(() => ({ status: 401, body: { detail: "invalid key" } }));
  try {
    await withApiKey("bad-key", async () => {
      await assert.rejects(() => synthesizeSpeech("hello", "en"), SarvamVoiceError);
    });
  } finally {
    restore();
  }
});

test("malformed response (missing audios) throws SarvamVoiceError", async () => {
  const restore = mockFetch(() => ({ status: 200, body: { request_id: "x" } }));
  try {
    await withApiKey("test-key", async () => {
      await assert.rejects(() => synthesizeSpeech("hello", "en"), SarvamVoiceError);
    });
  } finally {
    restore();
  }
});

test("network failure throws SarvamVoiceError, not silent fallback audio", async () => {
  const restore = mockFetch(() => "network-error");
  try {
    await withApiKey("test-key", async () => {
      await assert.rejects(() => synthesizeSpeech("hello", "en"), SarvamVoiceError);
    });
  } finally {
    restore();
  }
});

test("timeout throws SarvamVoiceError mentioning the timeout", async () => {
  const restore = mockFetch(() => "timeout");
  try {
    await withApiKey("test-key", async () => {
      await assert.rejects(
        () => synthesizeSpeech("hello", "en"),
        (err: unknown) => err instanceof SarvamVoiceError && /timed out/i.test(err.message)
      );
    });
  } finally {
    restore();
  }
});
