import { resolveRegion } from "./regionRegistry.js";
import { fetchNdviStats, SentinelStatisticsError } from "./sentinelStatistics.js";
import { isSentinelConfigured } from "./sentinelAuth.js";
import type { WeatherReading, WeatherSource } from "./weatherSource.js";

/**
 * Live WeatherSource backed by Sentinel-2 NDVI (P9) — real satellite
 * vegetation-index data via the Copernicus Data Space Ecosystem's
 * Sentinel Hub Statistical API (self-serve, free-tier, OAuth2 client
 * credentials — unlike IMD, which remains blocked on institutional
 * access). Confirmed working against the live endpoint this session:
 * mean NDVI ~0.056 for Yavatmal, August 2026.
 *
 * NDVI naturally ranges roughly [-1, 1]; the contract's thresholdValue is
 * an unsigned integer scaled x100 (same convention as rainfall mm — see
 * D7/docs/Schema.md § Units). This adapter reports mean NDVI shifted into
 * a non-negative real-unit range before the harness's own x100 scaling:
 *   reportedValue = (meanNdvi + 1) * 50   // maps [-1, 1] -> [0, 100]
 * A policy using TriggerType.VegetationIndexBelow must set its threshold
 * in this same shifted scale (e.g. a raw NDVI of 0.30 "unhealthy" cutoff
 * is thresholdValue for 65 in this scale, i.e. 6500 on-chain after the
 * harness's x100). This shift is confined entirely to this adapter — nothing
 * downstream (contract, harness, explain.ts) knows or needs to know NDVI
 * was ever negative-capable; they only ever see a plain non-negative
 * "measurement below threshold" comparison, exactly like rainfall.
 */
export class SentinelVegetationSource implements WeatherSource {
  readonly name = "Sentinel-2 NDVI (live)";

  constructor(private readonly windowDays: number = 14) {}

  async fetchReading(params: {
    regionId: string;
    periodId: number;
    sourceKey: "feed_a" | "feed_b";
  }): Promise<WeatherReading | null> {
    if (!isSentinelConfigured()) {
      console.error("[sentinel] SENTINEL_CLIENT_ID/SENTINEL_CLIENT_SECRET not configured — cannot fetch NDVI");
      return null;
    }

    const region = resolveRegion(params.regionId);
    if (!region) {
      console.error(`[sentinel] no coordinates registered for regionId "${params.regionId}" — cannot fetch NDVI`);
      return null;
    }

    const endDate = new Date(params.periodId * 86_400_000);
    const startDate = new Date(endDate.getTime() - (this.windowDays - 1) * 86_400_000);
    const fetchedAt = new Date().toISOString();

    console.log(
      `[sentinel] fetching NDVI regionId=${params.regionId} (${region.label}) bbox=${region.bbox.join(",")} ` +
        `window=${startDate.toISOString().slice(0, 10)}..${endDate.toISOString().slice(0, 10)} sourceKey=${params.sourceKey}`
    );

    let stats;
    try {
      stats = await fetchNdviStats(region.bbox, startDate, endDate);
    } catch (err) {
      const message = err instanceof SentinelStatisticsError ? err.message : String(err);
      console.error(`[sentinel] fetch failed for regionId=${params.regionId}: ${message}`);
      // Same principle as OpenMeteoWeatherSource: a real failure must not
      // look like "no reading yet" (null) or a fabricated value — rethrow.
      throw err;
    }

    if (stats === null) {
      console.error(
        `[sentinel] no valid (cloud-free) pixels for regionId=${params.regionId} window=${startDate.toISOString().slice(0, 10)}..${endDate.toISOString().slice(0, 10)}`
      );
      return null;
    }

    const reportedValue = (stats.mean + 1) * 50;

    console.log(
      `[sentinel] regionId=${params.regionId} meanNdvi=${stats.mean.toFixed(4)} reportedValue=${reportedValue.toFixed(2)} ` +
        `samples=${stats.sampleCount} noData=${stats.noDataCount} fetchedAt=${fetchedAt}`
    );

    return {
      value: reportedValue,
      measurementType: "ndvi",
      observedAt: fetchedAt,
    };
  }
}
