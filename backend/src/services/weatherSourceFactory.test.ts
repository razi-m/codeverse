import { test } from "node:test";
import assert from "node:assert/strict";
import { createWeatherSource, isLiveWeatherSource } from "./weatherSourceFactory.js";

const ORIGINAL = process.env.WEATHER_SOURCE;

function withWeatherSource<T>(value: string | undefined, fn: () => T): T {
  if (value === undefined) delete process.env.WEATHER_SOURCE;
  else process.env.WEATHER_SOURCE = value;
  try {
    return fn();
  } finally {
    if (ORIGINAL === undefined) delete process.env.WEATHER_SOURCE;
    else process.env.WEATHER_SOURCE = ORIGINAL;
  }
}

test("defaults to the simulated source when WEATHER_SOURCE is unset", () => {
  withWeatherSource(undefined, () => {
    const source = createWeatherSource("baseline");
    assert.equal(source.name, "Supabase (simulated)");
    assert.equal(isLiveWeatherSource(), false);
  });
});

test("WEATHER_SOURCE=simulated selects SupabaseWeatherSource", () => {
  withWeatherSource("simulated", () => {
    const source = createWeatherSource("drought");
    assert.equal(source.name, "Supabase (simulated)");
    assert.equal(isLiveWeatherSource(), false);
  });
});

test("WEATHER_SOURCE=open-meteo selects OpenMeteoWeatherSource", () => {
  withWeatherSource("open-meteo", () => {
    const source = createWeatherSource();
    assert.equal(source.name, "Open-Meteo (live)");
    assert.equal(isLiveWeatherSource(), true);
  });
});

test("WEATHER_SOURCE=sentinel selects SentinelVegetationSource", () => {
  withWeatherSource("sentinel", () => {
    const source = createWeatherSource();
    assert.equal(source.name, "Sentinel-2 NDVI (live)");
    assert.equal(isLiveWeatherSource(), true);
  });
});

test("switching WEATHER_SOURCE changes which adapter is returned, same call site", () => {
  const simulatedName = withWeatherSource("simulated", () => createWeatherSource().name);
  const openMeteoName = withWeatherSource("open-meteo", () => createWeatherSource().name);
  const sentinelName = withWeatherSource("sentinel", () => createWeatherSource().name);
  assert.notEqual(simulatedName, openMeteoName);
  assert.notEqual(simulatedName, sentinelName);
  assert.notEqual(openMeteoName, sentinelName);
});

test("an unrecognized WEATHER_SOURCE value falls back to simulated, never a silent live call", () => {
  withWeatherSource("totally-bogus", () => {
    const source = createWeatherSource("baseline");
    assert.equal(source.name, "Supabase (simulated)");
  });
});
