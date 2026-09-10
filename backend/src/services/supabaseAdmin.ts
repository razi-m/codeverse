import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

/**
 * Service-role client — the one deliberate exception to the anon-only
 * model in services/supabase.ts. Reaches app_users and policy_assignments
 * (backend/sql/002_auth.sql), which carry no anon RLS policy at all
 * because they ARE the authorization boundary, not presentational data.
 *
 * Never imported by anything the frontend can reach. Used only inside
 * Express auth middleware and admin-only route handlers.
 */

export const supabaseAdmin: SupabaseClient | null =
  config.supabaseUrl && config.supabaseServiceRoleKey
    ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export const isSupabaseAdminConfigured = () => supabaseAdmin !== null;

export type Role = "farmer" | "insurer" | "admin";

/**
 * Fails closed: no client, no row, or a query error all return null,
 * never a default role. Authorization callers must treat null as "deny",
 * unlike services/supabase.ts's safe() which degrades to null meaning
 * "no presentational data available" — a very different failure mode.
 */
export async function getRole(authUserId: string): Promise<Role | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("app_users")
      .select("role")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error || !data) return null;
    return data.role as Role;
  } catch (err) {
    console.error("[supabaseAdmin] getRole failed:", err);
    return null;
  }
}
