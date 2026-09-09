import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { policiesRouter } from "./routes/policies.js";
import { oracleRouter } from "./routes/oracle.js";
import * as insurance from "./services/insurance.js";
import { isSupabaseConfigured, getOracleSources } from "./services/supabase.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const contract = insurance.contractInfo();

  // Supabase reachability (T2.8): a real query, not just "is it configured" —
  // config can be present while the project is unreachable.
  const supabaseConfigured = isSupabaseConfigured();
  const supabaseReachable = supabaseConfigured ? (await getOracleSources()) !== null : false;

  let oracleCount: number | null = null;
  try {
    oracleCount = (await insurance.getOracleList()).length;
  } catch {
    oracleCount = null;
  }

  try {
    const status = await insurance.getChainStatus();
    res.json({
      ok: true,
      contract,
      chain: status,
      oracles: { registeredCount: oracleCount },
      supabase: { configured: supabaseConfigured, reachable: supabaseReachable },
    });
  } catch {
    // The API stays up even when the RPC node is down, so the frontend can
    // show "chain unreachable" instead of a dead backend.
    res.status(200).json({
      ok: true,
      contract,
      chain: null,
      warning: "RPC unreachable",
      oracles: { registeredCount: oracleCount },
      supabase: { configured: supabaseConfigured, reachable: supabaseReachable },
    });
  }
});

app.use("/api/policies", policiesRouter);
// GET /api/oracles (T2.9) and POST /api/oracles/simulate (T2.7) share one router.
app.use("/api/oracles", oracleRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  if (!insurance.isConfigured()) {
    console.warn("No deployment.json yet — deploy the contract to enable /api/policies");
  }
});
