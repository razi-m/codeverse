import { Router } from "express";
import * as insurance from "../services/insurance.js";
import { buildLedger, summarize } from "../services/explain.js";
import { getPolicyMetadata } from "../services/supabase.js";
import { translateLedger } from "../services/translate.js";
import { resolveRegion } from "../services/regionRegistry.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getRole } from "../services/supabaseAdmin.js";
import { farmerOwnsPolicy, policyIdsForFarmer } from "../services/policyAuthorization.js";

export const policiesRouter = Router();
policiesRouter.use(requireAuth);

/**
 * A farmer may only see policies assigned to them (policy_assignments);
 * insurer/admin see everything, same as the console already assumes.
 * Fails closed (403), never falls back to "show it anyway" — this is the
 * one place that turns policyId from the URL into a trusted value.
 */
async function authorizePolicyAccess(req: AuthedRequest, policyId: number): Promise<boolean> {
  const role = await getRole(req.authUser!.id);
  if (role === "insurer" || role === "admin") return true;
  if (role === "farmer") return farmerOwnsPolicy(req.authUser!.id, policyId);
  return false;
}

const MAX_LIMIT = 100;

/** Same convention as the retired posts.ts — offset/limit pagination, capped. */
function intParam(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function parsePolicyId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Attaches presentational metadata from Supabase, degrading to the raw
 * region code if it's unavailable (NFR10) — Supabase is non-authoritative
 * (D1) and this must never fail the response.
 *
 * Also attaches the region's coordinates (regionRegistry.ts) so the farmer
 * page can draw its plan and request live weather without hardcoding a
 * lat/lon of its own. Null when the region isn't registered — the UI is
 * expected to degrade, not guess.
 */
async function withDisplayName(policy: insurance.Policy) {
  const metadata = await getPolicyMetadata(policy.id);
  const region = resolveRegion(policy.regionId);
  return {
    ...policy,
    regionDisplayName: metadata?.region_display_name ?? policy.regionId,
    areaAcres: metadata?.area_acres ?? null,
    coordinates: region ? { latitude: region.latitude, longitude: region.longitude } : null,
  };
}

/**
 * Farmer-scoped: only policies assigned to the authenticated farmer.
 * Insurer/admin get the unfiltered list, same as before this existed.
 */
policiesRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const offset = intParam(req.query.offset, 0);
    const limit = intParam(req.query.limit, 20, MAX_LIMIT);

    const role = await getRole(req.authUser!.id);
    if (role === "insurer" || role === "admin") {
      const [policies, total] = await Promise.all([
        insurance.listPolicies(offset, limit),
        insurance.getPolicyCount(),
      ]);
      const withNames = await Promise.all(policies.map(withDisplayName));
      return res.json({ policies: withNames, total, offset, limit });
    }

    if (role === "farmer") {
      const ids = await policyIdsForFarmer(req.authUser!.id);
      const page = ids.slice(offset, offset + limit);
      const policies = await Promise.all(
        page.map(async (id) => {
          try {
            return await insurance.getPolicy(id);
          } catch {
            return null;
          }
        })
      );
      const withNames = await Promise.all(
        policies.filter((p): p is insurance.Policy => p !== null).map(withDisplayName)
      );
      return res.json({ policies: withNames, total: ids.length, offset, limit });
    }

    res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    next(err);
  }
});

policiesRouter.get("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = parsePolicyId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }
    if (!(await authorizePolicyAccess(req, id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let policy: insurance.Policy;
    try {
      policy = await insurance.getPolicy(id);
    } catch {
      return res.status(404).json({ error: "Policy not found" });
    }

    res.json(await withDisplayName(policy));
  } catch (err) {
    next(err);
  }
});

/**
 * The centrepiece (TRD § API surface) — chronological plain-language
 * decision history, reconstructed entirely from chain events (D11).
 *
 * `?lang=hi|mr` translates the same deterministic English text (P9) —
 * explain.ts's output is unchanged; see services/translate.ts. Any other
 * or missing value serves English, unchanged from before this existed.
 */
policiesRouter.get("/:id/ledger", async (req: AuthedRequest, res, next) => {
  try {
    const id = parsePolicyId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }
    if (!(await authorizePolicyAccess(req, id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let policy: insurance.Policy;
    try {
      policy = await insurance.getPolicy(id);
    } catch {
      return res.status(404).json({ error: "Policy not found" });
    }

    const events = await insurance.getPolicyEvents(id);
    const ledger = buildLedger(events);
    const summary = summarize(events, policy.status);

    const lang = typeof req.query.lang === "string" ? req.query.lang : null;
    const translated = await translateLedger(id, summary, ledger, lang);

    res.json({ policyId: id, ...translated });
  } catch (err) {
    next(err);
  }
});

/**
 * Raw on-chain proof: contract address, block numbers, transaction
 * hashes, event payloads. Deliberately un-translated — this panel is for
 * a farmer who wants to see the receipt behind the plain-language claim,
 * collapsed by default (Design.md § VerifyPanel).
 */
policiesRouter.get("/:id/verify", async (req: AuthedRequest, res, next) => {
  try {
    const id = parsePolicyId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }
    if (!(await authorizePolicyAccess(req, id))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      await insurance.getPolicy(id);
    } catch {
      return res.status(404).json({ error: "Policy not found" });
    }

    const [contract, events] = await Promise.all([
      insurance.contractInfo(),
      insurance.getPolicyEvents(id),
    ]);

    res.json({
      policyId: id,
      contract,
      events: events.map((e) => ({
        name: e.name,
        blockNumber: e.blockNumber,
        txHash: e.txHash,
        args: JSON.parse(JSON.stringify(e.args, (_, v) => (typeof v === "bigint" ? v.toString() : v))),
      })),
    });
  } catch (err) {
    next(err);
  }
});
