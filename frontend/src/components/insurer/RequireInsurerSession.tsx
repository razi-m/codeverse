import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../lib/AuthContext.js";
import { fetchMe } from "../../lib/api.js";

/**
 * First gate in front of /admin: a Supabase-authenticated insurer/admin
 * session. Layered in front of AdminGate's existing wallet-owner check,
 * not a replacement for it — this answers "is this person allowed to see
 * the console at all", AdminGate still answers "is this wallet allowed
 * to sign owner-only transactions", which the contract itself enforces
 * regardless of what the backend says.
 */
export function RequireInsurerSession({ children }: { children: ReactNode }) {
  const { session, loading: authLoading, requestOtp, verifyOtp, error } = useAuth();
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      setRole(undefined);
      return;
    }
    fetchMe()
      .then((me) => setRole(me.role))
      .catch(() => setRole(null));
  }, [session]);

  if (authLoading) {
    return <p style={{ padding: 24, color: "var(--text-muted)" }}>Loading…</p>;
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 380, padding: 24 }}>
        <h2>Insurer login</h2>
        {step === "phone" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              await requestOtp(phone);
              setSubmitting(false);
              setStep("otp");
            }}
          >
            <div className="field">
              <label htmlFor="insurer-phone">Mobile number</label>
              <input
                id="insurer-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            {error && <p className="field__error">{error}</p>}
            <button type="submit" className="button button--primary" disabled={submitting}>
              {submitting ? "Sending…" : "Send code"}
            </button>
          </form>
        )}
        {step === "otp" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              await verifyOtp(phone, otp);
              setSubmitting(false);
            }}
          >
            <div className="field">
              <label htmlFor="insurer-otp">Verification code</label>
              <input
                id="insurer-otp"
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            {error && <p className="field__error">{error}</p>}
            <button type="submit" className="button button--primary" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}
      </div>
    );
  }

  if (role === undefined) {
    return <p style={{ padding: 24, color: "var(--text-muted)" }}>Checking access…</p>;
  }

  if (role !== "insurer" && role !== "admin") {
    return (
      <div style={{ padding: 24, background: "var(--surface-sunken)", borderRadius: 8 }}>
        <p>This account is not authorized for the insurer console.</p>
      </div>
    );
  }

  return <>{children}</>;
}
