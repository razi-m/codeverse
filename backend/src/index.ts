import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { postsRouter } from "./routes/posts.js";
import * as chain from "./services/chain.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const contract = chain.contractInfo();
  try {
    const status = await chain.getChainStatus();
    res.json({ ok: true, contract, chain: status });
  } catch {
    // The API stays up even when the RPC node is down, so the frontend can
    // show "chain unreachable" instead of a dead backend.
    res.status(200).json({ ok: true, contract, chain: null, warning: "RPC unreachable" });
  }
});

app.use("/api/posts", postsRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  if (!chain.isConfigured()) {
    console.warn("No deployment.json yet — deploy the contract to enable /api/posts");
  }
});
