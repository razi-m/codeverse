import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { policiesRouter } from "./routes/policies.js";
import { oracleRouter } from "./routes/oracle.js";
import { weatherRouter } from "./routes/weather.js";
import { authRouter } from "./routes/authRoutes.js";
import { adminPolicyAssignmentsRouter } from "./routes/adminPolicyAssignments.js";
import { notificationsRouter } from "./routes/notifications.js";
import { farmerPreferencesRouter } from "./routes/farmerPreferences.js";
import { voiceCallRouter } from "./routes/voiceCall.js";
import * as insurance from "./services/insurance.js";
import { isSupabaseConfigured, getOracleSources } from "./services/supabase.js";
import { startPayoutListener } from "./services/payoutListener.js";

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
      weatherSource: config.weatherSource,
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
      weatherSource: config.weatherSource,
    });
  }
});

app.use("/api/policies", policiesRouter);
// GET /api/oracles (T2.9) and POST /api/oracles/simulate (T2.7) share one router.
app.use("/api/oracles", oracleRouter);
// GET /api/weather — inspection endpoint for live rainfall data (P9), no on-chain effect.
app.use("/api/weather", weatherRouter);
// POST /api/auth/link-farmer, GET /api/auth/me — farmer profile linking (auth phase).
app.use("/api/auth", authRouter);
// POST /api/admin/policy-assignments — insurer/admin only, assigns a policyId to a farmer.
app.use("/api/admin/policy-assignments", adminPolicyAssignmentsRouter);
// GET /api/notifications/health (open), POST /api/notifications/test-whatsapp (insurer/admin only).
app.use("/api/notifications", notificationsRouter);
// PUT /api/farmer/whatsapp — a farmer sets their own WhatsApp number/opt-in.
app.use("/api/farmer", farmerPreferencesRouter);
// GET /api/voice/twiml/:token, GET /api/voice/audio/:token — Twilio Voice
// webhook callbacks (unauthenticated by necessity, see routes/voiceCall.ts).
app.use("/api/voice", voiceCallRouter);

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
  startPayoutListener();
});
