import { Router } from "express";
import * as insurance from "../services/insurance.js";
import { buildLedger, summarize } from "../services/explain.js";
import { getPolicyMetadata } from "../services/supabase.js";

export const policiesRouter = Router();

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
 */
async function withDisplayName(policy: insurance.Policy) {
  const metadata = await getPolicyMetadata(policy.id);
  return {
    ...policy,
    regionDisplayName: metadata?.region_display_name ?? policy.regionId,
  };
}

policiesRouter.get("/", async (req, res, next) => {
  try {
    const offset = intParam(req.query.offset, 0);
    const limit = intParam(req.query.limit, 20, MAX_LIMIT);

    const [policies, total] = await Promise.all([
      insurance.listPolicies(offset, limit),
      insurance.getPolicyCount(),
    ]);
    const withNames = await Promise.all(policies.map(withDisplayName));

    res.json({ policies: withNames, total, offset, limit });
  } catch (err) {
    next(err);
  }
});

policiesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = parsePolicyId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
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
 */
policiesRouter.get("/:id/ledger", async (req, res, next) => {
  try {
    const id = parsePolicyId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
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

    res.json({ policyId: id, summary, ledger });
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
policiesRouter.get("/:id/verify", async (req, res, next) => {
  try {
    const id = parsePolicyId(req.params.id);
    if (id === null) {
      return res.status(400).json({ error: "id must be a positive integer" });
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
