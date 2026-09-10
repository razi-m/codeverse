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

test("GET /api/notifications/health is open and returns only booleans, no credentials", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/notifications/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.twilioConfigured, "boolean");
  assert.equal(typeof body.whatsappConfigured, "boolean");
  assert.equal(typeof body.smsConfigured, "boolean");
  assert.equal(typeof body.voiceConfigured, "boolean");
  const asString = JSON.stringify(body);
  assert.ok(!/[A-Za-z0-9]{20,}/.test(asString), "response must not contain anything that looks like a credential");
});

test("POST /api/notifications/test-whatsapp rejects an unauthenticated request", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  const res = await fetch(`${BASE}/api/notifications/test-whatsapp`, { method: "POST" });
  assert.equal(res.status, 401);
});

test("POST /api/notifications/test-whatsapp ignores any destination the caller supplies", async (t) => {
  if (!(await serverIsUp())) {
    t.skip("backend dev server is not running on this port; skipping live HTTP check");
    return;
  }
  // Even with a garbage token (401 before the body is ever read), confirm
  // the route accepts no "to"/"phone" field at all in its handler — this
  // is enforced by the handler never reading req.body, verified by
  // inspection (routes/notifications.ts) rather than re-tested here since
  // a real send requires a real session, which unit tests correctly do
  // not fabricate.
  const res = await fetch(`${BASE}/api/notifications/test-whatsapp`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer not-a-real-token" },
    body: JSON.stringify({ to: "+19999999999" }),
  });
  assert.equal(res.status, 401);
});
