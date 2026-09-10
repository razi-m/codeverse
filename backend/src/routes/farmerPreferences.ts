import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../services/supabaseAdmin.js";

export const farmerPreferencesRouter = Router();
farmerPreferencesRouter.use(requireAuth);

/** Lets a farmer set their own WhatsApp number and opt-in — never another farmer's. */
farmerPreferencesRouter.put("/whatsapp", async (req: AuthedRequest, res, next) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Not configured" });
    }
    const { whatsappNumber, optIn } = req.body ?? {};
    if (whatsappNumber !== null && typeof whatsappNumber !== "string") {
      return res.status(400).json({ error: "whatsappNumber must be a string or null" });
    }
    if (typeof optIn !== "boolean") {
      return res.status(400).json({ error: "optIn must be a boolean" });
    }
    if (typeof whatsappNumber === "string" && !/^\+[1-9][0-9]{7,14}$/.test(whatsappNumber)) {
      return res.status(400).json({ error: "whatsappNumber must be in E.164 format, e.g. +919876543210" });
    }

    const { error } = await supabaseAdmin
      .from("farmers")
      .update({ whatsapp_number: whatsappNumber, whatsapp_opt_in: optIn })
      .eq("auth_user_id", req.authUser!.id);

    if (error) {
      console.error("[farmerPreferences] update failed:", error);
      return res.status(500).json({ error: "Update failed" });
    }
    res.json({ whatsappNumber, optIn });
  } catch (err) {
    next(err);
  }
});
