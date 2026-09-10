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

test("POST /api/admin/policy-assignments rejects an unauthenticated request", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/admin/policy-assignments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ policyId: 1, farmerId: "00000000-0000-0000-0000-000000000000" }),
  });
  assert.equal(res.status, 401);
});

test("POST /api/admin/policy-assignments rejects a garbage bearer token", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/admin/policy-assignments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer not-a-real-token",
    },
    body: JSON.stringify({ policyId: 1, farmerId: "00000000-0000-0000-0000-000000000000" }),
  });
  assert.equal(res.status, 401);
});
