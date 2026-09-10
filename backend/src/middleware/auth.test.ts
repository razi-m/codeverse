import { test } from "node:test";
import assert from "node:assert/strict";
import { requireAuth, requireRole, type AuthedRequest } from "./auth.js";

/**
 * No real OTP/SMS sent anywhere here. The "tampered JWT" case does make a
 * real call to Supabase Auth, but with a token that is guaranteed invalid
 * by construction — deterministic and CI-safe, no phone number involved.
 */

function fakeReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as AuthedRequest;
  let statusCode = 200;
  let jsonBody: unknown = null;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
      return this;
    },
  } as any;
  return { req, res, getStatus: () => statusCode, getBody: () => jsonBody };
}

test("requireAuth rejects a request with no Authorization header", async () => {
  const { req, res, getStatus } = fakeReqRes();
  let nextCalled = false;
  await requireAuth(req, res, () => {
    nextCalled = true;
  });
  assert.equal(getStatus(), 401);
  assert.equal(nextCalled, false);
});

test("requireAuth rejects a malformed Authorization header", async () => {
  const { req, res, getStatus } = fakeReqRes({ authorization: "Bearer" });
  let nextCalled = false;
  await requireAuth(req, res, () => {
    nextCalled = true;
  });
  assert.equal(getStatus(), 401);
  assert.equal(nextCalled, false);
});

test("requireAuth rejects a garbage/tampered token", async () => {
  const { req, res, getStatus, getBody } = fakeReqRes({
    authorization: "Bearer not-a-real-jwt-at-all",
  });
  let nextCalled = false;
  await requireAuth(req, res, () => {
    nextCalled = true;
  });
  assert.equal(getStatus(), 401);
  assert.equal(nextCalled, false);
  assert.ok((getBody() as { error: string }).error);
});

test("requireRole rejects when no authUser is set", async () => {
  const { req, res, getStatus } = fakeReqRes();
  const middleware = requireRole("insurer", "admin");
  let nextCalled = false;
  await middleware(req, res, () => {
    nextCalled = true;
  });
  assert.equal(getStatus(), 401);
  assert.equal(nextCalled, false);
});
