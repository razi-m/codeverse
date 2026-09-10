import twilioLib from "twilio";
import { config } from "../config.js";

/**
 * Thin wrapper around the Twilio SDK. Never fabricates a delivery status —
 * every function returns exactly what Twilio's API reports, or throws.
 * Twilio credentials never leave this process (no VITE_*, no logs of the
 * auth token, no echo in API responses).
 */

let client: ReturnType<typeof twilioLib> | null = null;

function getClient() {
  if (!config.twilioAccountSid || !config.twilioAuthToken) return null;
  if (!client) {
    client = twilioLib(config.twilioAccountSid, config.twilioAuthToken);
  }
  return client;
}

export const isTwilioConfigured = () => getClient() !== null;
export const isWhatsappConfigured = () => isTwilioConfigured() && Boolean(config.twilioWhatsappFrom);
export const isSmsConfigured = () => isTwilioConfigured() && Boolean(config.twilioSmsFrom);

export type SendResult = {
  sid: string;
  status: string; // Twilio's own status string: queued, sent, delivered, failed, undelivered
};

/**
 * Sends a WhatsApp message via the Twilio Sandbox (or a production sender
 * once approved). Throws on any failure — callers (notificationRouter.ts)
 * are responsible for catching this and recording FAILED, never treating
 * a caught error as success.
 */
export async function sendWhatsapp(to: string, body: string): Promise<SendResult> {
  const c = getClient();
  if (!c) throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing)");
  if (!config.twilioWhatsappFrom) throw new Error("TWILIO_WHATSAPP_FROM is not configured");

  const message = await c.messages.create({
    from: `whatsapp:${config.twilioWhatsappFrom}`,
    to: `whatsapp:${to}`,
    body,
  });
  return { sid: message.sid, status: message.status };
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const c = getClient();
  if (!c) throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing)");
  if (!config.twilioSmsFrom) throw new Error("TWILIO_SMS_FROM is not configured");

  const message = await c.messages.create({
    from: config.twilioSmsFrom,
    to,
    body,
  });
  return { sid: message.sid, status: message.status };
}

/**
 * Re-fetches a message's current status from Twilio — used to confirm
 * actual delivery rather than trusting the initial "queued"/"sent"
 * response from the create() call above (Phase 10/13's "do not claim
 * DELIVERED unless Twilio actually reports it" requirement).
 */
export async function fetchMessageStatus(sid: string): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const message = await c.messages(sid).fetch();
    return message.status;
  } catch (err) {
    console.error("[twilio] fetchMessageStatus failed:", err);
    return null;
  }
}
