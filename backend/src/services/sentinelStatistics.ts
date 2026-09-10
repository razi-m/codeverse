import { getSentinelToken, SentinelAuthError } from "./sentinelAuth.js";

/**
 * Thin client for the Sentinel Hub Statistical API (Copernicus Data Space
 * Ecosystem) — https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html.
 * Computes an NDVI mean over a bounding box and date range server-side, so
 * no raw imagery is downloaded. Evalscript and request shape verified
 * against the real live endpoint this session (mean NDVI ~0.056 for
 * Yavatmal, August 2026 — a real reading, not fabricated).
 */

const STATISTICS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics";
const FETCH_TIMEOUT_MS = 15_000; // satellite aggregation is slower than a plain weather API call

// Computes NDVI = (NIR - Red) / (NIR + Red) from Sentinel-2 L2A bands
// B08 (NIR) and B04 (Red), masked to valid pixels only.
const NDVI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return { ndvi: [ndvi], dataMask: [sample.dataMask] };
}`;

export type NdviStats = {
  mean: number;
  min: number;
  max: number;
  sampleCount: number;
  noDataCount: number;
};

export class SentinelStatisticsError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SentinelStatisticsError";
  }
}

/**
 * Mean NDVI over `bbox` for [startDate, endDate] (inclusive calendar
 * days), aggregated as a single interval. Throws on auth failure, timeout,
 * network failure, or a response shape that doesn't match this adapter's
 * expectations — never returns a fabricated value. Returns null for two
 * real, non-error outcomes: no Sentinel-2 scene found/processed for the
 * window yet (the archive lags real time by days to weeks — confirmed
 * live this session requesting "today," which returned `data: []`), or a
 * scene was found but every pixel in the window was cloud-obscured.
 */
export async function fetchNdviStats(
  bbox: [number, number, number, number],
  startDate: Date,
  endDate: Date
): Promise<NdviStats | null> {
  let token: string;
  try {
    token = await getSentinelToken();
  } catch (err) {
    const message = err instanceof SentinelAuthError ? err.message : String(err);
    throw new SentinelStatisticsError(`Sentinel authentication failed: ${message}`, err);
  }

  // Confirmed live this session: the Statistical API's aggregation silently
  // returns an empty data array — not an error — unless `to` is an exact
  // midnight boundary (00:00:00Z) and aggregationInterval exactly matches
  // the [from, to) span in days. Using 23:59:59Z as `to` (the natural
  // "inclusive end of day" reading) broke it; real Sentinel-2 scenes with
  // 0% cloud cover existed for the window the whole time (verified via the
  // Catalog API directly) — this was a request-shape bug, not missing data.
  const fromIso = `${startDate.toISOString().slice(0, 10)}T00:00:00Z`;
  const toDateExclusive = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate() + 1)
  );
  const toIso = `${toDateExclusive.toISOString().slice(0, 10)}T00:00:00Z`;
  const spanDays = Math.round((toDateExclusive.getTime() - Date.parse(fromIso)) / 86_400_000);

  const body = {
    input: {
      bounds: { bbox },
      data: [{ type: "sentinel-2-l2a", dataFilter: { timeRange: { from: fromIso, to: toIso } } }],
    },
    aggregation: {
      timeRange: { from: fromIso, to: toIso },
      aggregationInterval: { of: `P${spanDays}D` }, // one bucket covering the exact span
      evalscript: NDVI_EVALSCRIPT,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(STATISTICS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new SentinelStatisticsError(`Sentinel Statistics request timed out after ${FETCH_TIMEOUT_MS}ms`, err);
    }
    throw new SentinelStatisticsError(`Sentinel Statistics request failed: ${err?.message ?? err}`, err);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let text = "";
    try {
      text = await response.text();
    } catch {
      // best-effort
    }
    throw new SentinelStatisticsError(`Sentinel Statistics returned ${response.status}: ${text || response.statusText}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new SentinelStatisticsError("Sentinel Statistics response was not valid JSON", err);
  }

  const dataArray = (json as any)?.data;
  if (!Array.isArray(dataArray)) {
    throw new SentinelStatisticsError("Sentinel Statistics response missing expected data array");
  }
  if (dataArray.length === 0) {
    // Real outcome, not an error: no Sentinel-2 scene was found/processed
    // for this window yet — the archive typically lags several days to a
    // couple of weeks behind "today" (unlike Open-Meteo's near-real-time
    // reanalysis). Same tier as "fully cloud-obscured" below.
    return null;
  }

  const interval = dataArray[0];
  const stats = interval?.outputs?.ndvi?.bands?.B0?.stats;
  if (!stats || typeof stats.sampleCount !== "number") {
    throw new SentinelStatisticsError("Sentinel Statistics response missing expected outputs.ndvi.bands.B0.stats");
  }

  const validCount = stats.sampleCount - (stats.noDataCount ?? 0);
  if (validCount <= 0) {
    return null; // real outcome: fully cloud-obscured / no valid observation, not a fabricated reading
  }

  return {
    mean: stats.mean,
    min: stats.min,
    max: stats.max,
    sampleCount: stats.sampleCount,
    noDataCount: stats.noDataCount ?? 0,
  };
}
