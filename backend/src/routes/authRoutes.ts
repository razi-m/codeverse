import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../services/supabaseAdmin.js";

export const authRouter = Router();
authRouter.use(requireAuth);

/**
 * Links the just-authenticated Supabase user to an existing farmers row
 * by phone number, or creates one if none exists yet. Runs once per
 * farmer, right after their first successful OTP verification.
 *
 * Phone match uses the authenticated session's own verified phone number
 * (req.authUser.phone, set by requireAuth from the Supabase session) —
 * never a phone number supplied in the request body, which would let a
 * caller claim any farmer's record by guessing their number.
 */
authRouter.post("/link-farmer", async (req: AuthedRequest, res, next) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Authentication is not configured" });
    }
    const { id: authUserId, phone } = req.authUser!;
    if (!phone) {
      return res.status(400).json({ error: "No verified phone number on this session" });
    }

    // E.164 from Supabase Auth (e.g. "919876543210") vs schema.sql's
    // 10-digit farmers.phone check constraint — take the last 10 digits.
    const localPhone = phone.replace(/\D/g, "").slice(-10);

    const { data: existing, error: findError } = await supabaseAdmin
      .from("farmers")
      .select("id, auth_user_id")
      .eq("phone", localPhone)
      .maybeSingle();

    if (findError) {
      console.error("[authRoutes] link-farmer lookup failed:", findError);
      return res.status(500).json({ error: "Lookup failed" });
    }

    if (existing) {
      if (existing.auth_user_id && existing.auth_user_id !== authUserId) {
        // Someone else's session already claimed this farmer row — refuse
        // rather than silently reassigning it.
        return res.status(409).json({ error: "This phone number is already linked to another account" });
      }
      if (!existing.auth_user_id) {
        const { error: updateError } = await supabaseAdmin
          .from("farmers")
          .update({ auth_user_id: authUserId })
          .eq("id", existing.id);
        if (updateError) {
          console.error("[authRoutes] link-farmer update failed:", updateError);
          return res.status(500).json({ error: "Link failed" });
        }
      }
      return res.json({ farmerId: existing.id, linked: true });
    }

    // No farmers row seeded for this phone yet — create a minimal one.
    // full_name is required by schema.sql; a placeholder is fine, an
    // insurer can fill in real details later via the admin console.
    // wallet_address is `unique` in schema.sql, so a fixed all-zero
    // placeholder would collide across farmers — derive a distinct
    // placeholder from authUserId instead (this farmer genuinely has no
    // wallet; wallet-free by design). Never a real address, never reused.
    const placeholderWallet = `0x${authUserId.replace(/-/g, "").padEnd(40, "0").slice(0, 40)}`;
    const { data: created, error: insertError } = await supabaseAdmin
      .from("farmers")
      .insert({
        wallet_address: placeholderWallet,
        full_name: "Unnamed farmer",
        phone: localPhone,
        auth_user_id: authUserId,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      console.error("[authRoutes] link-farmer insert failed:", insertError);
      return res.status(500).json({ error: "Could not create farmer profile" });
    }

    // First-ever login for this phone: also grant the farmer role, since
    // app_users otherwise has no row and every authorization check fails
    // closed with no role.
    const { error: roleError } = await supabaseAdmin
      .from("app_users")
      .upsert({ auth_user_id: authUserId, role: "farmer" }, { onConflict: "auth_user_id" });
    if (roleError) {
      console.error("[authRoutes] link-farmer role upsert failed:", roleError);
    }

    res.json({ farmerId: created.id, linked: true, created: true });
  } catch (err) {
    next(err);
  }
});

/** The authenticated user's own role — lets the frontend decide which UI to show. */
authRouter.get("/me", async (req: AuthedRequest, res, next) => {
  try {
    if (!supabaseAdmin) {
      return res.json({ authenticated: true, role: null });
    }
    const { data } = await supabaseAdmin
      .from("app_users")
      .select("role")
      .eq("auth_user_id", req.authUser!.id)
      .maybeSingle();
    res.json({ authenticated: true, role: data?.role ?? null });
  } catch (err) {
    next(err);
  }
});
