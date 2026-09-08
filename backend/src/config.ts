import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export type Deployment = {
  address: string;
  chainId: number;
  network: string;
  deployedAt: string;
  abi: unknown[];
};

/**
 * deployment.json is written by contracts/scripts/deploy.js. It is absent until
 * the first deploy, so we degrade gracefully instead of crashing on boot.
 */
export function loadDeployment(): Deployment | null {
  const file = path.join(dir, "deployment.json");
  if (!fs.existsSync(file)) return null;

  const deployment = JSON.parse(fs.readFileSync(file, "utf8")) as Deployment;
  const override = process.env.CONTRACT_ADDRESS?.trim();
  if (override) deployment.address = override;
  return deployment;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
