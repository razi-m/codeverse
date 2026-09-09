/**
 * WeatherSource — the adapter boundary between "where a reading comes from"
 * and "what the oracle harness does with it" (T2.6a, user instruction
 * 2026-09-09).
 *
 * The harness calls fetchReading() and nothing else. It never imports
 * Supabase, a scenario name, or any provider-specific shape directly.
 * That is what makes swapping the simulated feed for a real one — IMD
 * (rainfall) or Sentinel (vegetation index) — a config change instead of a
 * rewrite: implement this interface, point the harness at it, done. The
 * contract and the (future, P9) notification pipeline never see this file
 * at all, so neither has anything to change either.
 */

export type WeatherReading = {
  /** Real units (mm for rainfall, index points for NDVI) — NOT scaled x100.
   *  The harness applies the on-chain x100 scale (D7) at submission time,
   *  the one conversion boundary; a source never scales its own output. */
  value: number;
  measurementType: "rainfall" | "ndvi";
  observedAt: string; // ISO timestamp
};

export interface WeatherSource {
  /** Human-readable name for logs/health checks — "Supabase (simulated)",
   *  "IMD Rainfall API", etc. */
  readonly name: string;

  /**
   * One reading for one region/period/oracle feed. Returns null if no
   * reading exists yet for that combination — the harness treats that as
   * "nothing to submit", not an error.
   */
  fetchReading(params: {
    regionId: string;
    periodId: number;
    sourceKey: "feed_a" | "feed_b";
  }): Promise<WeatherReading | null>;
}
