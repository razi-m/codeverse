import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin, getRole, type Role } from "../services/supabaseAdmin.js";

/**
 * Verifies a Supabase session JWT by round-tripping to Supabase Auth
 * (auth.getUser) rather than decoding/verifying it locally — simpler,
 * and avoids the backend having to manage Supabase's signing-key
 * rotation itself. Matches the existing pattern in services/supabase.ts
 * of deferring protocol details to the Supabase client rather than
 * hand-rolling them.
 */

export type AuthedRequest = Request & {
  authUser?: { id: string; phone: string | null };
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!supabaseAdmin) {
    // Fails closed: a missing SUPABASE_SERVICE_ROLE_KEY must deny access,
    // never silently let requests through unauthenticated.
    return res.status(401).json({ error: "Authentication is not configured" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    req.authUser = { id: data.user.id, phone: data.user.phone ?? null };
    next();
  } catch (err) {
    console.error("[auth] requireAuth failed:", err);
    res.status(401).json({ error: "Not authenticated" });
  }
}

/** Must run after requireAuth — reads req.authUser it sets. */
export function requireRole(...roles: Role[]) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const role = await getRole(req.authUser.id);
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
