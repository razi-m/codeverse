import { test } from "node:test";
import assert from "node:assert/strict";
import { notifyPayout, type PayoutNotificationInput } from "./notificationRouter.js";
import { supabaseAdmin, isSupabaseAdminConfigured } from "./supabaseAdmin.js";

/**
 * Never sends a real Twilio message. TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN
 * are unset in the test environment by default, so sendWhatsapp/sendSms
 * throw immediately with "Twilio is not configured" before any network
 * call — notifyPayout must record that as a clean SKIPPED/FAILED outcome,
 * never crash, and never claim a message was sent.
 *
 * Uses dedicated fake policy IDs (999901+) and a throwaway farmer row so
 * these never collide with real demo data.
 */

const FAKE_POLICY_ID = 999901;

function fakeInput(overrides: Partial<PayoutNotificationInput> = {}): PayoutNotificationInput {
  return {
    chainId: 31337,
    contractAddress: "0x0000000000000000000000000000000000dEaD",
    txHash: "0x" + "11".repeat(32),
    logIndex: 0,
    policyId: FAKE_POLICY_ID,
    farmerAddress: "0x1234567890123456789012345678901234567890",
    amountWei: "1000000000000000000",
    consensusValueScaled: "1000",
    thresholdValueScaled: "2000",
    ...overrides,
  };
}

test("notifyPayout never throws when no farmer is assigned to the policy", async () => {
  await assert.doesNotReject(() => notifyPayout(fakeInput({ policyId: 999999999 })));
});

test("notifyPayout never throws when Twilio is not configured", async (t) => {
  if (!isSupabaseAdminConfigured()) {
    t.skip("SUPABASE_SERVICE_ROLE_KEY not set in this environment");
    return;
  }
  await assert.doesNotReject(() => notifyPayout(fakeInput()));
});

test("notifyPayout is idempotent: a second call with the same event/channel does not re-attempt", async (t) => {
  if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
    t.skip("SUPABASE_SERVICE_ROLE_KEY not set in this environment");
    return;
  }

  // Set up a throwaway farmer opted in to WhatsApp, so the router reaches
  // the send attempt (which fails closed since Twilio isn't configured in
  // tests) and records a row — then confirm a repeat call doesn't insert
  // a second one for the same event_identifier/channel.
  const { data: farmer } = await supabaseAdmin
    .from("farmers")
    .insert({
      wallet_address: "0x" + "9".repeat(40),
      full_name: "Test Farmer (idempotency)",
      whatsapp_number: "+10000000001",
      whatsapp_opt_in: true,
    })
    .select("id")
    .single();
  assert.ok(farmer);

  const policyId = 999902;
  await supabaseAdmin.from("policy_assignments").insert({
    policy_id: policyId,
    farmer_id: farmer!.id,
    assigned_by: "test",
  });

  const input = fakeInput({ policyId, txHash: "0x" + "22".repeat(32) });

  await notifyPayout(input);
  const { data: firstPass } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("policy_id", policyId);
  const countAfterFirst = firstPass?.length ?? 0;

  await notifyPayout(input);
  const { data: secondPass } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("policy_id", policyId);
  const countAfterSecond = secondPass?.length ?? 0;

  assert.equal(countAfterSecond, countAfterFirst, "a repeat call for the same event must not create new rows");

  // Cleanup — these tables are operational, not sacred, but tidy up anyway.
  await supabaseAdmin.from("notifications").delete().eq("policy_id", policyId);
  await supabaseAdmin.from("policy_assignments").delete().eq("policy_id", policyId);
  await supabaseAdmin.from("farmers").delete().eq("id", farmer!.id);
});

test("notifyPayout skips WhatsApp send when the farmer has not opted in", async (t) => {
  if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
    t.skip("SUPABASE_SERVICE_ROLE_KEY not set in this environment");
    return;
  }

  const { data: farmer } = await supabaseAdmin
    .from("farmers")
    .insert({
      wallet_address: "0x" + "8".repeat(40),
      full_name: "Test Farmer (no opt-in)",
      whatsapp_number: "+10000000002",
      whatsapp_opt_in: false,
    })
    .select("id")
    .single();
  assert.ok(farmer);

  const policyId = 999903;
  await supabaseAdmin.from("policy_assignments").insert({
    policy_id: policyId,
    farmer_id: farmer!.id,
    assigned_by: "test",
  });

  await notifyPayout(fakeInput({ policyId, txHash: "0x" + "33".repeat(32) }));

  const { data: rows } = await supabaseAdmin
    .from("notifications")
    .select("status")
    .eq("policy_id", policyId)
    .eq("channel", "whatsapp");

  assert.equal(rows?.[0]?.status, "SKIPPED");

  await supabaseAdmin.from("notifications").delete().eq("policy_id", policyId);
  await supabaseAdmin.from("policy_assignments").delete().eq("policy_id", policyId);
  await supabaseAdmin.from("farmers").delete().eq("id", farmer!.id);
});

test("notifyPayout skips WhatsApp send when the farmer has no WhatsApp number", async (t) => {
  if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
    t.skip("SUPABASE_SERVICE_ROLE_KEY not set in this environment");
    return;
  }

  const { data: farmer } = await supabaseAdmin
    .from("farmers")
    .insert({
      wallet_address: "0x" + "7".repeat(40),
      full_name: "Test Farmer (no number)",
      whatsapp_opt_in: true,
    })
    .select("id")
    .single();
  assert.ok(farmer);

  const policyId = 999904;
  await supabaseAdmin.from("policy_assignments").insert({
    policy_id: policyId,
    farmer_id: farmer!.id,
    assigned_by: "test",
  });

  await notifyPayout(fakeInput({ policyId, txHash: "0x" + "44".repeat(32) }));

  const { data: rows } = await supabaseAdmin
    .from("notifications")
    .select("status")
    .eq("policy_id", policyId)
    .eq("channel", "whatsapp");

  assert.equal(rows?.[0]?.status, "SKIPPED");

  await supabaseAdmin.from("notifications").delete().eq("policy_id", policyId);
  await supabaseAdmin.from("policy_assignments").delete().eq("policy_id", policyId);
  await supabaseAdmin.from("farmers").delete().eq("id", farmer!.id);
});
