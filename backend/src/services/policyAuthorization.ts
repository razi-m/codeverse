import { supabaseAdmin } from "./supabaseAdmin.js";

/**
 * Authorization, not presentation — deliberately does NOT follow the
 * safe()/degrade-to-null pattern in services/supabase.ts. That pattern is
 * correct for non-authoritative data (losing a plot description must
 * never break the payout path), but authorization must fail closed: a
 * missing service-role key or an unreachable Supabase must deny access,
 * never grant it.
 */
export async function farmerOwnsPolicy(authUserId: string, policyId: number): Promise<boolean> {
  if (!supabaseAdmin) return false;

  try {
    const { data, error } = await supabaseAdmin
      .from("policy_assignments")
      .select("id, farmers!inner(auth_user_id)")
      .eq("policy_id", policyId)
      .eq("farmers.auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      console.error("[policyAuthorization] farmerOwnsPolicy query failed:", error);
      return false;
    }
    return data !== null;
  } catch (err) {
    console.error("[policyAuthorization] farmerOwnsPolicy unreachable:", err);
    return false;
  }
}

/** Policy IDs assigned to this farmer's auth user — for the farmer-scoped list endpoint. */
export async function policyIdsForFarmer(authUserId: string): Promise<number[]> {
  if (!supabaseAdmin) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from("policy_assignments")
      .select("policy_id, farmers!inner(auth_user_id)")
      .eq("farmers.auth_user_id", authUserId);

    if (error || !data) {
      if (error) console.error("[policyAuthorization] policyIdsForFarmer query failed:", error);
      return [];
    }
    return data.map((row) => row.policy_id as number);
  } catch (err) {
    console.error("[policyAuthorization] policyIdsForFarmer unreachable:", err);
    return [];
  }
}
