import { useEffect, useState } from "react";
import { fetchNotificationHealth, sendTestWhatsapp, sendTestVoiceCall, type NotificationHealth } from "../../lib/api.js";

/**
 * Insurer console panel: shows safe Twilio configuration status (no
 * credentials, ever) and lets an insurer send one test WhatsApp message
 * to the fixed NOTIFICATION_TEST_RECIPIENT configured server-side —
 * never an arbitrary number typed here.
 */
export function NotificationPanel() {
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [callSending, setCallSending] = useState(false);
  const [callResult, setCallResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [callLanguage, setCallLanguage] = useState<"en" | "hi" | "mr">("en");

  useEffect(() => {
    fetchNotificationHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  async function handleTestSend() {
    setSending(true);
    setResult(null);
    try {
      const res = await sendTestWhatsapp();
      setResult({ ok: true, message: `Sent — Twilio status: ${res.status} (id: ${res.providerMessageId})` });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setSending(false);
    }
  }

  async function handleTestCall() {
    setCallSending(true);
    setCallResult(null);
    try {
      const res = await sendTestVoiceCall(callLanguage);
      setCallResult({ ok: true, message: `Call placed — Twilio status: ${res.status} (id: ${res.providerCallSid})` });
    } catch (err) {
      setCallResult({ ok: false, message: err instanceof Error ? err.message : "Call failed" });
    } finally {
      setCallSending(false);
    }
  }

  return (
    <div>
      <div className="section-head" style={{ marginTop: 0 }}>
        <span className="section-head__text">Notification system</span>
        <span className="section-head__rule" />
      </div>

      {!health ? (
        <p className="mono-label">Loading…</p>
      ) : (
        <div className="stat-grid">
          {(
            [
              ["Twilio account", health.twilioConfigured],
              ["WhatsApp sender", health.whatsappConfigured],
              ["SMS fallback", health.smsConfigured],
              ["Voice", health.voiceConfigured],
            ] as const
          ).map(([label, ok]) => (
            <div key={label} className={`stat-panel${ok ? "" : " stat-panel--neutral"}`}>
              <span className="stat-panel__label">{label}</span>
              <span className="stat-panel__value" style={{ color: ok ? "var(--paid)" : "var(--text-faint)" }}>
                {ok ? "Configured" : "Not configured"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "var(--sp-6)" }}>
        <button
          className="button button--primary"
          onClick={handleTestSend}
          disabled={sending || !health?.whatsappConfigured}
        >
          {sending ? "Sending…" : "Send test WhatsApp message"}
        </button>
        <p className="empty-note" style={{ marginTop: "var(--sp-2)" }}>
          Sends only to the fixed test recipient configured in the backend — never a number entered here.
        </p>
        {result && (
          <p className={result.ok ? "readout__note" : "field__error"} style={{ marginTop: "var(--sp-3)" }}>
            {result.message}
          </p>
        )}
      </div>

      <div style={{ marginTop: "var(--sp-6)" }}>
        <select
          value={callLanguage}
          onChange={(e) => setCallLanguage(e.target.value as "en" | "hi" | "mr")}
          style={{ marginRight: "var(--sp-3)" }}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="mr">Marathi</option>
        </select>
        <button
          className="button button--primary"
          onClick={handleTestCall}
          disabled={callSending || !health?.voiceConfigured}
        >
          {callSending ? "Calling…" : "Send test voice call"}
        </button>
        <p className="empty-note" style={{ marginTop: "var(--sp-2)" }}>
          Places a real call to the fixed test recipient configured in the backend, speaking the selected language via Sarvam TTS.
        </p>
        {callResult && (
          <p className={callResult.ok ? "readout__note" : "field__error"} style={{ marginTop: "var(--sp-3)" }}>
            {callResult.message}
          </p>
        )}
      </div>
    </div>
  );
}
