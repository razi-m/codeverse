import { resolveRegion } from "./regionRegistry.js";
import { fetchDailyPrecipitation, OpenMeteoError } from "./openMeteo.js";
import type { WeatherReading, WeatherSource } from "./weatherSource.js";

/**
 * Live WeatherSource backed by Open-Meteo (real, keyless, free) — used in
 * place of IMD, whose real API requires an institutional key not available
 * in this hackathon session (confirmed by a live 401 "API key missing"
 * response from api.imd.gov.in). This adapter is a stand-in data source,
 * not IMD, and must never be described as IMD (docs/handoff.md, P9).
 *
 * The policy's threshold is cumulative rainfall over a trailing window
 * (docs/TRD.md's `thresholdValue` is compared once per periodId — see
 * CropInsurance.sol's evaluatePolicy), so this adapter sums Open-Meteo's
 * daily figures across `windowDays` ending at periodId and returns that
 * single cumulative value as the reading, in the same real-unit shape
 * (mm, unscaled) every other WeatherSource returns. Nothing downstream
 * (harness, contract) needs to know this value is a sum rather than a
 * single day's observation.
 */
export class OpenMeteoWeatherSource implements WeatherSource {
  readonly name = "Open-Meteo (live)";

  constructor(private readonly windowDays: number = 14) {}

  async fetchReading(params: {
    regionId: string;
    periodId: number;
    sourceKey: "feed_a" | "feed_b";
  }): Promise<WeatherReading | null> {
    const region = resolveRegion(params.regionId);
    if (!region) {
      console.error(
        `[open-meteo] no coordinates registered for regionId "${params.regionId}" — cannot fetch a live reading`
      );
      return null;
    }

    // periodId is days-since-epoch (docs/Schema.md), matching the contract's
    // own interpretation in evaluatePolicy. The window ends at periodId and
    // runs windowDays back, inclusive of both ends.
    const endDate = new Date(params.periodId * 86_400_000);
    const startDate = new Date(endDate.getTime() - (this.windowDays - 1) * 86_400_000);

    const fetchedAt = new Date().toISOString();
    console.log(
      `[open-meteo] fetching regionId=${params.regionId} (${region.label}) lat=${region.latitude} lon=${region.longitude} ` +
        `window=${startDate.toISOString().slice(0, 10)}..${endDate.toISOString().slice(0, 10)} sourceKey=${params.sourceKey}`
    );

    let daily;
    try {
      daily = await fetchDailyPrecipitation(region.latitude, region.longitude, startDate, endDate);
    } catch (err) {
      const message = err instanceof OpenMeteoError ? err.message : String(err);
      console.error(`[open-meteo] fetch failed for regionId=${params.regionId}: ${message}`);
      // Real failure, not "no data yet" — the harness's submitFromFeed
      // already distinguishes null (nothing to submit) from a thrown error
      // at the call site; a network/API failure must not look like a quiet
      // "no reading" any more than it should look like a fabricated one, so
      // this rethrows rather than returning null.
      throw err;
    }

    const values = daily.values.filter((v): v is number => v !== null);
    if (values.length === 0) {
      console.error(
        `[open-meteo] no precipitation values returned for regionId=${params.regionId} window=${startDate.toISOString().slice(0, 10)}..${endDate.toISOString().slice(0, 10)}`
      );
      return null;
    }
    if (values.length < daily.values.length) {
      console.log(
        `[open-meteo] ${daily.values.length - values.length} of ${daily.values.length} days in window not yet available from Open-Meteo; summing the remainder`
      );
    }

    const cumulativeMm = values.reduce((sum, v) => sum + v, 0);

    console.log(
      `[open-meteo] regionId=${params.regionId} cumulative=${cumulativeMm.toFixed(2)}mm over ${values.length} day(s) fetchedAt=${fetchedAt}`
    );

    return {
      value: cumulativeMm,
      measurementType: "rainfall",
      observedAt: fetchedAt,
    };
  }
}
