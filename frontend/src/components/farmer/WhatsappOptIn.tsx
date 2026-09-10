import { useState, type FormEvent } from "react";
import { setWhatsappPreference } from "../../lib/api.js";

/**
 * Lets a farmer set the number that receives payout WhatsApp alerts, and
 * opt in/out. Starts blank/unopted rather than fetching current state on
 * mount — this is a write-only preference form (Phase 7's opt-in gate);
 * re-submitting the same values is harmless and idempotent server-side.
 */
export function WhatsappOptIn() {
  const [number, setNumber] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await setWhatsappPreference(number || null, optIn);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 className="card__title">WhatsApp payout alerts</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="wa-number">WhatsApp number</label>
          <input
            id="wa-number"
            type="tel"
            placeholder="+91XXXXXXXXXX"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
          <span>Send me a WhatsApp message when a payout is triggered</span>
        </label>
        {error && <p className="field__error">{error}</p>}
        {saved && !error && <p className="readout__note">Saved.</p>}
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
