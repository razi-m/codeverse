import { Router } from "express";
import { SupabaseWeatherSource } from "../services/supabaseWeatherSource.js";
import { runScenario } from "../services/oracleHarness.js";
import * as insurance from "../services/insurance.js";

export const oracleRouter = Router();

const VALID_SCENARIOS = ["baseline", "drought", "disagreement"] as const;
type Scenario = (typeof VALID_SCENARIOS)[number];

/**
 * Demo control endpoint (T2.7) — submits both feeds' readings for a
 * scenario and evaluates. Not farmer-facing; this is what a demo operator
 * (or a curl command) uses to make a scenario happen on command.
 */
oracleRouter.post("/simulate", async (req, res, next) => {
  try {
    const { policyId, scenario, periodId } = req.body ?? {};

    if (!Number.isInteger(policyId) || policyId < 1) {
      return res.status(400).json({ error: "policyId must be a positive integer" });
    }
    if (!VALID_SCENARIOS.includes(scenario)) {
      return res.status(400).json({ error: `scenario must be one of ${VALID_SCENARIOS.join(", ")}` });
    }

    const policy = await insurance.getPolicy(policyId);
    const resolvedPeriodId = Number.isInteger(periodId)
      ? periodId
      : Math.floor(Date.now() / 1000 / 86400);

    const source = new SupabaseWeatherSource(scenario as Scenario);
    const result = await runScenario(source, {
      policyId,
      regionId: policy.regionId,
      periodId: resolvedPeriodId,
    });

    res.json({ policyId, scenario, periodId: resolvedPeriodId, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * Registered feeds (T2.9). With ?policyId=&periodId= also reports whether
 * each oracle has submitted for that specific policy/period — a full
 * "last submission across all history" would require scanning events
 * (D11), which is event-log reconstruction work reserved for P6/P7's
 * ledger; this stays a direct read against current registration state.
 */
oracleRouter.get("/", async (req, res, next) => {
  try {
    const addresses = await insurance.getOracleList();

    const policyId = Number(req.query.policyId);
    const periodId = Number(req.query.periodId);
    if (!Number.isInteger(policyId) || !Number.isInteger(periodId)) {
      return res.json({ oracles: addresses.map((address) => ({ address })) });
    }

    const readings = await insurance.getReadings(policyId, periodId);
    const oracles = addresses.map((address) => {
      const reading = readings.find((r) => r.oracle.toLowerCase() === address.toLowerCase());
      return {
        address,
        hasSubmitted: Boolean(reading),
        submittedAt: reading?.submittedAt ?? null,
        value: reading?.value ?? null,
      };
    });
    res.json({ oracles, policyId, periodId });
  } catch (err) {
    next(err);
  }
});
