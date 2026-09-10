import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenMeteoWeatherSource } from "./openMeteoWeatherSource.js";
import { OpenMeteoError, fetchDailyPrecipitation } from "./openMeteo.js";
import type { WeatherSource } from "./weatherSource.js";
import { SupabaseWeatherSource } from "./supabaseWeatherSource.js";

// periodId for 2026-08-14 (days since epoch) — a fixed date so the 14-day
// window and expected Open-Meteo query range are deterministic in tests.
const PERIOD_ID = Math.floor(Date.UTC(2026, 7, 14) / 86_400_000);

function mockFetch(handler: (url: URL) => { status: number; body: unknown } | "timeout" | "network-error") {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
    const result = handler(url);
    if (result === "network-error") throw new TypeError("fetch failed");
    if (result === "timeout") {
      // Simulate an abort by rejecting the way a real AbortController would.
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

test("WeatherSource interface compatibility: OpenMeteoWeatherSource satisfies WeatherSource", () => {
  const source: WeatherSource = new OpenMeteoWeatherSource();
  assert.equal(typeof source.fetchReading, "function");
  assert.equal(source.name, "Open-Meteo (live)");
});

test("normalizes a real-shaped Open-Meteo response into a cumulative WeatherReading", async () => {
  const restore = mockFetch((url) => {
    assert.equal(url.hostname, "archive-api.open-meteo.com");
    assert.equal(url.searchParams.get("latitude"), "20.3888");
    assert.equal(url.searchParams.get("longitude"), "78.1204");
    return {
      status: 200,
      body: {
        daily: {
          time: ["2026-08-01", "2026-08-02", "2026-08-03"],
          precipitation_sum: [1.3, 0.8, 3.1],
        },
      },
    };
  });
  try {
    const source = new OpenMeteoWeatherSource(3);
    const reading = await source.fetchReading({ regionId: "MH-VID-04", periodId: PERIOD_ID, sourceKey: "feed_a" });
    assert.ok(reading);
    assert.equal(reading!.measurementType, "rainfall");
    assert.ok(Math.abs(reading!.value - 5.2) < 1e-9, `expected ~5.2mm, got ${reading!.value}`);
    assert.ok(reading!.observedAt);
  } finally {
    restore();
  }
});

test("unregistered regionId returns null rather than guessing coordinates", async () => {
  const source = new OpenMeteoWeatherSource();
  const reading = await source.fetchReading({ regionId: "XX-NOPE-99", periodId: PERIOD_ID, sourceKey: "feed_a" });
  assert.equal(reading, null);
});

test("malformed Open-Meteo response throws OpenMeteoError, never a fabricated reading", async () => {
  const restore = mockFetch(() => ({ status: 200, body: { daily: { time: ["2026-08-01"] } } }));
  try {
    await assert.rejects(() => fetchDailyPrecipitation(20.4, 78.1, new Date(), new Date()), OpenMeteoError);
  } finally {
    restore();
  }
});

test("non-OK HTTP response throws OpenMeteoError with status", async () => {
  const restore = mockFetch(() => ({ status: 500, body: { error: "server error" } }));
  try {
    await assert.rejects(
      () => fetchDailyPrecipitation(20.4, 78.1, new Date(), new Date()),
      (err: unknown) => err instanceof OpenMeteoError && /500/.test(err.message)
    );
  } finally {
    restore();
  }
});

test("network failure throws OpenMeteoError, not a silent null", async () => {
  const restore = mockFetch(() => "network-error");
  try {
    await assert.rejects(() => fetchDailyPrecipitation(20.4, 78.1, new Date(), new Date()), OpenMeteoError);
  } finally {
    restore();
  }
});

test("timeout throws OpenMeteoError mentioning the timeout", async () => {
  const restore = mockFetch(() => "timeout");
  try {
    await assert.rejects(
      () => fetchDailyPrecipitation(20.4, 78.1, new Date(), new Date()),
      (err: unknown) => err instanceof OpenMeteoError && /timed out/i.test(err.message)
    );
  } finally {
    restore();
  }
});

test("OpenMeteoWeatherSource.fetchReading propagates a fetch failure instead of returning null", async () => {
  const restore = mockFetch(() => "network-error");
  try {
    const source = new OpenMeteoWeatherSource();
    await assert.rejects(() =>
      source.fetchReading({ regionId: "MH-VID-04", periodId: PERIOD_ID, sourceKey: "feed_a" })
    );
  } finally {
    restore();
  }
});

test("days with a null precipitation value are excluded from the cumulative sum", async () => {
  const restore = mockFetch(() => ({
    status: 200,
    body: {
      daily: {
        time: ["2026-08-01", "2026-08-02", "2026-08-03"],
        precipitation_sum: [1.3, null, 3.1],
      },
    },
  }));
  try {
    const source = new OpenMeteoWeatherSource(3);
    const reading = await source.fetchReading({ regionId: "MH-VID-04", periodId: PERIOD_ID, sourceKey: "feed_a" });
    assert.ok(reading);
    assert.ok(Math.abs(reading!.value - 4.4) < 1e-9);
  } finally {
    restore();
  }
});

test("simulated SupabaseWeatherSource still satisfies WeatherSource unchanged", () => {
  const source: WeatherSource = new SupabaseWeatherSource("drought");
  assert.equal(typeof source.fetchReading, "function");
  assert.equal(source.name, "Supabase (simulated)");
});
