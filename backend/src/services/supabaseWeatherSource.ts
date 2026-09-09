import { getWeatherFeed } from "./supabase.js";
import type { WeatherReading, WeatherSource } from "./weatherSource.js";

/**
 * Default WeatherSource implementation (T2.6a) — reads the `weather_feed`
 * mock dataset. `scenario` is a concept this adapter understands and the
 * harness does not; a future IMD/Sentinel adapter has no such concept and
 * implements WeatherSource without it.
 */
export class SupabaseWeatherSource implements WeatherSource {
  readonly name = "Supabase (simulated)";

  constructor(private readonly scenario: "baseline" | "drought" | "disagreement") {}

  async fetchReading(params: {
    regionId: string;
    periodId: number;
    sourceKey: "feed_a" | "feed_b";
  }): Promise<WeatherReading | null> {
    const rows = await getWeatherFeed(params.regionId, params.periodId, this.scenario);
    if (!rows) return null; // Supabase unreachable or misconfigured — degrade, don't throw

    const row = rows.find((r) => r.source_key === params.sourceKey);
    if (!row) return null;

    return {
      value: row.observed_value,
      measurementType: row.measurement_type,
      observedAt: row.observed_at,
    };
  }
}
