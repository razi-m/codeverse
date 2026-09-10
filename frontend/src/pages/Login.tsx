import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.js";
import { Masthead } from "../components/shared/Masthead.js";

/**
 * Phone entry, then OTP entry. Supabase Auth owns OTP generation,
 * verification, and expiration entirely (see lib/AuthContext.tsx) — this
 * page only collects what the farmer types and forwards it.
 */
export default function Login() {
  const { requestOtp, verifyOtp, error, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  if (session) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  async function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await requestOtp(phone);
    setSubmitting(false);
    setStep("otp");
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await verifyOtp(phone, otp);
    setSubmitting(false);
  }

  return (
    <div className="farmer-page">
      <Masthead />
      <div className="card" style={{ marginTop: "var(--sp-8)", maxWidth: 420 }}>
        <h1 className="card__title">Log in to KisanShield</h1>

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit}>
            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91XXXXXXXXXX"
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
          <form onSubmit={handleOtpSubmit}>
            <p className="readout__note" style={{ marginBottom: "var(--sp-4)" }}>
              We sent a code to {phone}.
            </p>
            <div className="field">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            {error && <p className="field__error">{error}</p>}
            <button type="submit" className="button button--primary" disabled={submitting}>
              {submitting ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              className="button"
              style={{ marginLeft: "var(--sp-3)" }}
              onClick={() => setStep("phone")}
            >
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
