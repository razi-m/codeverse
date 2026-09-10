import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseAuthConfigured } from "./supabaseClient.js";

type AuthState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Thin wrapper around Supabase Auth's phone-OTP flow. Supabase owns OTP
 * generation, verification, and expiration entirely — this file never
 * generates, stores, or inspects an OTP value itself, only forwards what
 * the farmer types to supabase.auth.verifyOtp.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function requestOtp(phone: string) {
    setError(null);
    if (!supabase) {
      setError("Login is not configured.");
      return;
    }
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    if (err) setError(err.message);
  }

  async function verifyOtp(phone: string, token: string) {
    setError(null);
    if (!supabase) {
      setError("Login is not configured.");
      return;
    }
    const { error: err } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    if (err) {
      setError(err.message);
      return;
    }
    // Links this Supabase user to a farmers row (creates one if none
    // exists) — must run once per login, since it's what lets
    // policyAuthorization.ts resolve this session to a farmer_id at all.
    try {
      const { linkFarmer } = await import("./api.js");
      await linkFarmer();
    } catch (linkErr) {
      console.error("[auth] link-farmer failed:", linkErr);
    }
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, error, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { isSupabaseAuthConfigured };
