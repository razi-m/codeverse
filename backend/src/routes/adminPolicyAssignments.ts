import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { supabaseAdmin } from "../services/supabaseAdmin.js";

export const adminPolicyAssignmentsRouter = Router();
adminPolicyAssignmentsRouter.use(requireAuth, requireRole("insurer", "admin"));

/** Assigns an on-chain policyId to a farmer, so that farmer can view it. */
adminPolicyAssignmentsRouter.post("/", async (req, res, next) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Authentication is not configured" });
    }
    const { policyId, farmerId } = req.body ?? {};
    if (!Number.isInteger(policyId) || policyId < 1) {
      return res.status(400).json({ error: "policyId must be a positive integer" });
    }
    if (typeof farmerId !== "string" || farmerId.length === 0) {
      return res.status(400).json({ error: "farmerId must be a non-empty string" });
    }

    const { data, error } = await supabaseAdmin
      .from("policy_assignments")
      .insert({ policy_id: policyId, farmer_id: farmerId, assigned_by: "admin-console" })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "This policy is already assigned to this farmer" });
      }
      console.error("[adminPolicyAssignments] insert failed:", error);
      return res.status(500).json({ error: "Assignment failed" });
    }

    res.status(201).json({ id: data.id, policyId, farmerId });
  } catch (err) {
    next(err);
  }
});
