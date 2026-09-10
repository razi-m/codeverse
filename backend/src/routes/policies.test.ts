import { test } from "node:test";
import assert from "node:assert/strict";
import { config } from "../config.js";

/**
 * With no SUPABASE_SERVICE_ROLE_KEY configured (the common case in a dev
 * environment before that credential is provided), requireAuth fails
 * closed for every request regardless of role — this is the behavior
 * that matters most: a misconfigured backend must deny, never grant,
 * blanket access to policy data. Exercises the real app via fetch against
 * a running server rather than re-implementing Express internals.
 */

const BASE = `http://127.0.0.1:${config.port}`;

async function serverIsUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

test("GET /api/policies/1 rejects a request with no Authorization header", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/policies/1`);
  assert.equal(res.status, 401);
});

test("GET /api/policies/1 rejects a garbage bearer token", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/policies/1`, {
    headers: { authorization: "Bearer not-a-real-token" },
  });
  assert.equal(res.status, 401);
});

test("GET /api/policies (list) rejects an unauthenticated request", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/policies`);
  assert.equal(res.status, 401);
});
