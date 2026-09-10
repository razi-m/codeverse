import { test } from "node:test";
import assert from "node:assert/strict";
import { SentinelVegetationSource } from "./sentinelVegetationSource.js";
import { fetchNdviStats, SentinelStatisticsError } from "./sentinelStatistics.js";
import { _resetSentinelTokenCache } from "./sentinelAuth.js";
import type { WeatherSource } from "./weatherSource.js";

const ORIGINAL = { id: process.env.SENTINEL_CLIENT_ID, secret: process.env.SENTINEL_CLIENT_SECRET };
const PERIOD_ID = Math.floor(Date.UTC(2026, 7, 14) / 86_400_000);

function withCreds<T>(fn: () => Promise<T>): Promise<T> {
  process.env.SENTINEL_CLIENT_ID = "test-id";
  process.env.SENTINEL_CLIENT_SECRET = "test-secret";
  _resetSentinelTokenCache();
  return fn().finally(() => {
    if (ORIGINAL.id === undefined) delete process.env.SENTINEL_CLIENT_ID;
    else process.env.SENTINEL_CLIENT_ID = ORIGINAL.id;
    if (ORIGINAL.secret === undefined) delete process.env.SENTINEL_CLIENT_SECRET;
    else process.env.SENTINEL_CLIENT_SECRET = ORIGINAL.secret;
    _resetSentinelTokenCache();
  });
}

function withoutCreds<T>(fn: () => Promise<T>): Promise<T> {
  delete process.env.SENTINEL_CLIENT_ID;
  delete process.env.SENTINEL_CLIENT_SECRET;
  _resetSentinelTokenCache();
  return fn().finally(() => {
    if (ORIGINAL.id === undefined) delete process.env.SENTINEL_CLIENT_ID;
    else process.env.SENTINEL_CLIENT_ID = ORIGINAL.id;
    if (ORIGINAL.secret === undefined) delete process.env.SENTINEL_CLIENT_SECRET;
    else process.env.SENTINEL_CLIENT_SECRET = ORIGINAL.secret;
    _resetSentinelTokenCache();
  });
}

/** Mocks both the token endpoint and the statistics endpoint by URL. */
function mockFetch(statsHandler: (url: URL, body: any) => { status: number; body: unknown } | "network-error") {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.hostname.includes("identity.dataspace")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "mock-token", expires_in: 1800 }),
        text: async () => "{}",
      } as unknown as Response;
    }
    const body = JSON.parse(init.body);
    const result = statsHandler(url, body);
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

function ndviStatsResponse(mean: number, sampleCount = 65536, noDataCount = 0) {
  return {
    data: [
      {
        interval: { from: "2026-08-01T00:00:00Z", to: "2026-08-14T00:00:00Z" },
        outputs: { ndvi: { bands: { B0: { stats: { mean, min: mean - 0.1, max: mean + 0.1, sampleCount, noDataCount } } } } },
      },
    ],
  };
}

test("WeatherSource interface compatibility: SentinelVegetationSource satisfies WeatherSource", () => {
  const source: WeatherSource = new SentinelVegetationSource();
  assert.equal(typeof source.fetchReading, "function");
  assert.equal(source.name, "Sentinel-2 NDVI (live)");
});

test("normalizes a real-shaped Statistics response into a WeatherReading, shifted to non-negative", async () => {
  const restore = mockFetch((url, body) => {
    assert.equal(url.hostname, "sh.dataspace.copernicus.eu");
    assert.deepEqual(body.input.bounds.bbox, [78.1004, 20.3688, 78.1404, 20.4088]);
    return { status: 200, body: ndviStatsResponse(0.056) };
  });
  try {
    await withCreds(async () => {
      const source = new SentinelVegetationSource(14);
      const reading = await source.fetchReading({ regionId: "MH-VID-04", periodId: PERIOD_ID, sourceKey: "feed_a" });
      assert.ok(reading);
      assert.equal(reading!.measurementType, "ndvi");
      // (0.056 + 1) * 50 = 52.8
      assert.ok(Math.abs(reading!.value - 52.8) < 1e-9, `expected ~52.8, got ${reading!.value}`);
    });
  } finally {
    restore();
  }
});

test("unregistered regionId returns null rather than guessing a bbox", async () => {
  await withCreds(async () => {
    const source = new SentinelVegetationSource();
    const reading = await source.fetchReading({ regionId: "XX-NOPE-99", periodId: PERIOD_ID, sourceKey: "feed_a" });
    assert.equal(reading, null);
  });
});

test("missing Sentinel credentials returns null rather than throwing", async () => {
  await withoutCreds(async () => {
    const source = new SentinelVegetationSource();
    const reading = await source.fetchReading({ regionId: "MH-VID-04", periodId: PERIOD_ID, sourceKey: "feed_a" });
    assert.equal(reading, null);
  });
});

test("zero valid pixels (fully cloud-obscured) returns null, not a fabricated reading", async () => {
  const restore = mockFetch(() => ({ status: 200, body: ndviStatsResponse(0, 100, 100) }));
  try {
    await withCreds(async () => {
      const source = new SentinelVegetationSource();
      const reading = await source.fetchReading({ regionId: "MH-VID-04", periodId: PERIOD_ID, sourceKey: "feed_a" });
      assert.equal(reading, null);
    });
  } finally {
    restore();
  }
});

test("an empty data array (no scene processed for the window yet) returns null, not an error", async () => {
  // Confirmed live this session: requesting "today" against the real API
  // returns {"data":[],"status":"OK"} — Sentinel-2 L2A processing lags
  // real time, unlike Open-Meteo's near-real-time reanalysis.
  const restore = mockFetch(() => ({ status: 200, body: { data: [], status: "OK" } }));
  try {
    await withCreds(async () => {
      const result = await fetchNdviStats([78.1, 20.37, 78.14, 20.41], new Date(), new Date());
      assert.equal(result, null);
    });
  } finally {
    restore();
  }
});

test("SentinelVegetationSource.fetchReading returns null (not throws) when no scene is available yet", async () => {
  const restore = mockFetch(() => ({ status: 200, body: { data: [], status: "OK" } }));
  try {
    await withCreds(async () => {
      const source = new SentinelVegetationSource();
      const reading = await source.fetchReading({ regionId: "MH-VID-04", periodId: PERIOD_ID, sourceKey: "feed_a" });
      assert.equal(reading, null);
    });
  } finally {
    restore();
  }
});

test("malformed Statistics response throws SentinelStatisticsError", async () => {
  const restore = mockFetch(() => ({ status: 200, body: { data: [{}] } }));
  try {
    await withCreds(async () => {
      await assert.rejects(
        () => fetchNdviStats([78.1, 20.37, 78.14, 20.41], new Date(), new Date()),
        SentinelStatisticsError
      );
    });
  } finally {
    restore();
  }
});

test("non-OK HTTP response throws SentinelStatisticsError with status", async () => {
  const restore = mockFetch(() => ({ status: 400, body: { message: "Bad Request" } }));
  try {
    await withCreds(async () => {
      await assert.rejects(
        () => fetchNdviStats([78.1, 20.37, 78.14, 20.41], new Date(), new Date()),
        (err: unknown) => err instanceof SentinelStatisticsError && /400/.test(err.message)
      );
    });
  } finally {
    restore();
  }
});

test("network failure throws SentinelStatisticsError, not a silent null", async () => {
  const restore = mockFetch(() => "network-error");
  try {
    await withCreds(async () => {
      await assert.rejects(
        () => fetchNdviStats([78.1, 20.37, 78.14, 20.41], new Date(), new Date()),
        SentinelStatisticsError
      );
    });
  } finally {
    restore();
  }
});

test("SentinelVegetationSource.fetchReading propagates a fetch failure instead of returning null", async () => {
  const restore = mockFetch(() => "network-error");
  try {
    await withCreds(async () => {
      const source = new SentinelVegetationSource();
      await assert.rejects(() =>
        source.fetchReading({ regionId: "MH-VID-04", periodId: PERIOD_ID, sourceKey: "feed_a" })
      );
    });
  } finally {
    restore();
  }
});
