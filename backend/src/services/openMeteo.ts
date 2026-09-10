/**
 * Thin client for Open-Meteo's Historical Weather (Archive) API —
 * https://open-meteo.com/en/docs/historical-weather-api. Free, keyless,
 * no signup: no secret to configure or leak. Used as the live weather
 * data source in place of IMD, whose real API requires an institutional
 * key not obtainable in this hackathon session (see docs/handoff.md).
 *
 * This is a real external network call, not a simulation — errors are
 * surfaced, never papered over with a fabricated reading.
 */

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const FETCH_TIMEOUT_MS = 8_000;

export type DailyPrecipitation = {
  /** ISO date strings, e.g. "2026-08-01" */
  dates: string[];
  /** mm per day, same index as dates; null where Open-Meteo has no value yet */
  values: (number | null)[];
};

export class OpenMeteoError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "OpenMeteoError";
  }
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Fetches daily precipitation for one coordinate over [startDate, endDate]
 * (inclusive, both `Date`s interpreted as calendar days). Throws
 * OpenMeteoError on timeout, network failure, non-OK response, or a
 * response shape that doesn't match what this adapter expects — callers
 * must not treat a thrown error as "zero rainfall".
 */
export async function fetchDailyPrecipitation(
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<DailyPrecipitation> {
  const url = new URL(ARCHIVE_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", toIsoDate(startDate));
  url.searchParams.set("end_date", toIsoDate(endDate));
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("timezone", "Asia/Kolkata");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new OpenMeteoError(`Open-Meteo request timed out after ${FETCH_TIMEOUT_MS}ms`, err);
    }
    throw new OpenMeteoError(`Open-Meteo request failed: ${err?.message ?? err}`, err);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // ignore — body is best-effort for the error message
    }
    throw new OpenMeteoError(`Open-Meteo returned ${response.status}: ${body || response.statusText}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    throw new OpenMeteoError("Open-Meteo response was not valid JSON", err);
  }

  const daily = (json as any)?.daily;
  const dates = daily?.time;
  const values = daily?.precipitation_sum;
  if (!Array.isArray(dates) || !Array.isArray(values) || dates.length !== values.length) {
    throw new OpenMeteoError("Open-Meteo response missing expected daily.time/precipitation_sum arrays");
  }

  return { dates, values };
}
