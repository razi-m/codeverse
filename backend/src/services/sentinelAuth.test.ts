import { test } from "node:test";
import assert from "node:assert/strict";
import { getSentinelToken, isSentinelConfigured, SentinelAuthError, _resetSentinelTokenCache } from "./sentinelAuth.js";

const ORIGINAL = { id: process.env.SENTINEL_CLIENT_ID, secret: process.env.SENTINEL_CLIENT_SECRET };

function withCreds<T>(id: string | undefined, secret: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (id === undefined) delete process.env.SENTINEL_CLIENT_ID;
  else process.env.SENTINEL_CLIENT_ID = id;
  if (secret === undefined) delete process.env.SENTINEL_CLIENT_SECRET;
  else process.env.SENTINEL_CLIENT_SECRET = secret;
  _resetSentinelTokenCache();
  return fn().finally(() => {
    if (ORIGINAL.id === undefined) delete process.env.SENTINEL_CLIENT_ID;
    else process.env.SENTINEL_CLIENT_ID = ORIGINAL.id;
    if (ORIGINAL.secret === undefined) delete process.env.SENTINEL_CLIENT_SECRET;
    else process.env.SENTINEL_CLIENT_SECRET = ORIGINAL.secret;
    _resetSentinelTokenCache();
  });
}

function mockFetch(handler: () => { status: number; body: unknown } | "network-error") {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    const result = handler();
    if (result === "network-error") throw new TypeError("fetch failed");
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      statusText: String(result.status),
      json: async () => result.body,
      text: async () => JSON.stringify(result.body),
    } as unknown as Response;
  }) as typeof fetch;
  return { restore: () => (globalThis.fetch = original), callCount: () => calls };
}

test("isSentinelConfigured reflects whether both id and secret are set", () => {
  withCreds("id", "secret", async () => assert.equal(isSentinelConfigured(), true));
  withCreds(undefined, "secret", async () => assert.equal(isSentinelConfigured(), false));
  withCreds("id", undefined, async () => assert.equal(isSentinelConfigured(), false));
});

test("throws SentinelAuthError when credentials are missing", async () => {
  await withCreds(undefined, undefined, async () => {
    await assert.rejects(() => getSentinelToken(), SentinelAuthError);
  });
});

test("exchanges credentials for a token via client_credentials grant", async () => {
  const { restore } = mockFetch(() => ({
    status: 200,
    body: { access_token: "abc123", expires_in: 1800 },
  }));
  try {
    await withCreds("id", "secret", async () => {
      const token = await getSentinelToken();
      assert.equal(token, "abc123");
    });
  } finally {
    restore();
  }
});

test("caches the token across calls instead of re-fetching every time", async () => {
  const { restore, callCount } = mockFetch(() => ({
    status: 200,
    body: { access_token: "cached-token", expires_in: 1800 },
  }));
  try {
    await withCreds("id", "secret", async () => {
      await getSentinelToken();
      await getSentinelToken();
      await getSentinelToken();
      assert.equal(callCount(), 1);
    });
  } finally {
    restore();
  }
});

test("re-fetches once the cached token is past its expiry", async () => {
  const { restore, callCount } = mockFetch(() => ({
    status: 200,
    body: { access_token: "short-lived", expires_in: 0 }, // already effectively expired
  }));
  try {
    await withCreds("id", "secret", async () => {
      await getSentinelToken();
      await getSentinelToken();
      assert.ok(callCount() >= 2);
    });
  } finally {
    restore();
  }
});

test("non-OK auth response throws SentinelAuthError", async () => {
  const { restore } = mockFetch(() => ({ status: 401, body: { error: "invalid_client" } }));
  try {
    await withCreds("bad-id", "bad-secret", async () => {
      await assert.rejects(() => getSentinelToken(), SentinelAuthError);
    });
  } finally {
    restore();
  }
});

test("malformed auth response throws SentinelAuthError", async () => {
  const { restore } = mockFetch(() => ({ status: 200, body: { foo: "bar" } }));
  try {
    await withCreds("id", "secret", async () => {
      await assert.rejects(() => getSentinelToken(), SentinelAuthError);
    });
  } finally {
    restore();
  }
});

test("network failure throws SentinelAuthError, not a silent failure", async () => {
  const { restore } = mockFetch(() => "network-error");
  try {
    await withCreds("id", "secret", async () => {
      await assert.rejects(() => getSentinelToken(), SentinelAuthError);
    });
  } finally {
    restore();
  }
});
