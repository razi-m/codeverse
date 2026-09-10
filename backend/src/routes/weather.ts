import { Router } from "express";
import { fetchDailyPrecipitation, OpenMeteoError } from "../services/openMeteo.js";

export const weatherRouter = Router();

/**
 * Inspection endpoint (P9) — fetches live rainfall from Open-Meteo for
 * arbitrary coordinates and returns it raw, without submitting anything
 * on-chain or touching a policy. Lets a demo operator sanity-check what a
 * live reading would look like before OpenMeteoWeatherSource ever feeds it
 * into the oracle harness.
 *
 * GET /api/weather?lat=20.3888&lon=78.1204&days=14
 */
weatherRouter.get("/", async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const days = req.query.days !== undefined ? Number(req.query.days) : 14;

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: "lat must be a number between -90 and 90" });
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: "lon must be a number between -180 and 180" });
    }
    if (!Number.isInteger(days) || days < 1 || days > 92) {
      return res.status(400).json({ error: "days must be an integer between 1 and 92" });
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days - 1) * 86_400_000);

    const daily = await fetchDailyPrecipitation(lat, lon, startDate, endDate);
    const values = daily.values.filter((v): v is number => v !== null);
    const cumulativeMm = values.reduce((sum, v) => sum + v, 0);

    res.json({
      source: "Open-Meteo (live)",
      latitude: lat,
      longitude: lon,
      startDate: daily.dates[0] ?? null,
      endDate: daily.dates[daily.dates.length - 1] ?? null,
      daily: daily.dates.map((date, i) => ({ date, precipitationMm: daily.values[i] })),
      cumulativeMm,
      daysWithData: values.length,
      daysRequested: days,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof OpenMeteoError) {
      return res.status(502).json({ error: err.message });
    }
    next(err);
  }
});
