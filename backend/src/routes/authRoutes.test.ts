import { test } from "node:test";
import assert from "node:assert/strict";
import { config } from "../config.js";

const BASE = `http://127.0.0.1:${config.port}`;

async function serverIsUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

test("POST /api/auth/link-farmer rejects an unauthenticated request", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/auth/link-farmer`, { method: "POST" });
  assert.equal(res.status, 401);
});

test("GET /api/auth/me rejects an unauthenticated request", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/auth/me`);
  assert.equal(res.status, 401);
});
