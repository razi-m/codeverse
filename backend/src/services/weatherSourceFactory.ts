import { SupabaseWeatherSource } from "./supabaseWeatherSource.js";
import { OpenMeteoWeatherSource } from "./openMeteoWeatherSource.js";
import { SentinelVegetationSource } from "./sentinelVegetationSource.js";
import type { WeatherSource } from "./weatherSource.js";

/**
 * Single selection point for which WeatherSource the oracle harness uses
 * (P9). Route/business logic (routes/oracle.ts) calls this instead of
 * constructing a source directly, so switching between deterministic demo
 * data and live data is a config change (WEATHER_SOURCE env var), never a
 * code change at the call site.
 *
 *   WeatherSource
 *      +-- SupabaseWeatherSource      ("simulated" — deterministic scenarios)
 *      +-- OpenMeteoWeatherSource     ("open-meteo" — live rainfall)
 *      +-- SentinelVegetationSource   ("sentinel" — live Sentinel-2 NDVI)
 *      +-- (future) ImdWeatherSource — same interface, once IMD API access
 *          is available; nothing else in this file or its callers changes.
 *
 * "simulated" requires a scenario name (baseline/drought/disagreement) —
 * the two live sources do not, since there is no scenario to select, only
 * whatever the real provider actually reports.
 */
export type Scenario = "baseline" | "drought" | "disagreement";
export type WeatherSourceMode = "simulated" | "open-meteo" | "sentinel";

/**
 * Read directly at call time, not imported from config.ts's frozen value —
 * this is the one setting a demo operator plausibly flips mid-process
 * (switching live/simulated between scenario runs) rather than only at
 * boot, so it must not require a restart to take effect.
 */
function currentWeatherSourceMode(): WeatherSourceMode {
  const raw = process.env.WEATHER_SOURCE?.trim();
  if (raw === "open-meteo" || raw === "sentinel") return raw;
  return "simulated";
}

export function createWeatherSource(scenario?: Scenario): WeatherSource {
  switch (currentWeatherSourceMode()) {
    case "open-meteo":
      return new OpenMeteoWeatherSource();
    case "sentinel":
      return new SentinelVegetationSource();
    case "simulated":
    default:
      return new SupabaseWeatherSource(scenario ?? "baseline");
  }
}

export function isLiveWeatherSource(): boolean {
  return currentWeatherSourceMode() !== "simulated";
}
