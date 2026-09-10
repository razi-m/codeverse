import { test } from "node:test";
import assert from "node:assert/strict";
import { farmerOwnsPolicy, policyIdsForFarmer } from "./policyAuthorization.js";
import { isSupabaseAdminConfigured } from "./supabaseAdmin.js";

/**
 * SUPABASE_SERVICE_ROLE_KEY is not set in every environment (it's a new,
 * deliberately narrow credential — see config.ts). These tests must pass
 * either way: when it's absent, authorization must fail closed (false /
 * empty list), never throw and never grant access.
 */

test("farmerOwnsPolicy fails closed when supabaseAdmin is not configured", async (t) => {
  if (isSupabaseAdminConfigured()) {
    t.skip("SUPABASE_SERVICE_ROLE_KEY is set in this environment; covered by the live test below instead");
    return;
  }
  const result = await farmerOwnsPolicy("00000000-0000-0000-0000-000000000000", 999999);
  assert.equal(result, false);
});

test("policyIdsForFarmer returns an empty list when supabaseAdmin is not configured", async (t) => {
  if (isSupabaseAdminConfigured()) {
    t.skip("SUPABASE_SERVICE_ROLE_KEY is set in this environment; covered by the live test below instead");
    return;
  }
  const result = await policyIdsForFarmer("00000000-0000-0000-0000-000000000000");
  assert.deepEqual(result, []);
});

test("farmerOwnsPolicy returns false for a nonexistent farmer/policy pair", async (t) => {
  if (!isSupabaseAdminConfigured()) {
    t.skip("SUPABASE_SERVICE_ROLE_KEY not set in this environment");
    return;
  }
  const result = await farmerOwnsPolicy("00000000-0000-0000-0000-000000000000", 999999);
  assert.equal(result, false);
});
