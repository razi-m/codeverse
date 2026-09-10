import { test } from "node:test";
import assert from "node:assert/strict";
import { isTwilioConfigured, isWhatsappConfigured, isSmsConfigured, sendWhatsapp, sendSms } from "./twilio.js";

/** No real Twilio call is made anywhere in this file. */

test("isTwilioConfigured reflects whether credentials are set", () => {
  // Reflects whatever backend/.env actually has — this test only asserts
  // the function doesn't throw and returns a boolean, since the real
  // configured state varies by environment.
  assert.equal(typeof isTwilioConfigured(), "boolean");
});

test("isWhatsappConfigured and isSmsConfigured return booleans without throwing", () => {
  assert.equal(typeof isWhatsappConfigured(), "boolean");
  assert.equal(typeof isSmsConfigured(), "boolean");
});

test("sendWhatsapp throws a clear error when Twilio is not configured, never fabricates success", async (t) => {
  if (isTwilioConfigured()) {
    t.skip("Twilio is configured in this environment; this specific unconfigured-path test does not apply");
    return;
  }
  await assert.rejects(() => sendWhatsapp("+10000000000", "test"), /not configured/i);
});

test("sendSms throws a clear error when Twilio is not configured, never fabricates success", async (t) => {
  if (isTwilioConfigured()) {
    t.skip("Twilio is configured in this environment; this specific unconfigured-path test does not apply");
    return;
  }
  await assert.rejects(() => sendSms("+10000000000", "test"), /not configured/i);
});
