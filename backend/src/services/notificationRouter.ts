import { ethers } from "ethers";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { sendWhatsapp, sendSms, isWhatsappConfigured, isSmsConfigured } from "./twilio.js";
import { placeVoiceCall, isVoiceCallConfigured } from "../routes/voiceCall.js";
import { translateText, isSarvamConfigured, SarvamError, type SupportedLanguage } from "./sarvam.js";

/**
 * Routes a payout event to the farmer's preferred channel(s), with
 * idempotency (one notification per event/channel, ever, surviving
 * restarts) and a deterministic WhatsApp -> SMS fallback. Never coupled
 * directly to the contract or the event listener — payoutListener.ts
 * calls notifyPayout() with plain data, this file knows nothing about
 * ethers.
 */

export type PayoutNotificationInput = {
  chainId: number;
  contractAddress: string;
  txHash: string;
  logIndex: number;
  policyId: number;
  farmerAddress: string; // on-chain Policy.farmer — used only for the message text's audit trail, never to look up a phone number
  amountWei: string;
  consensusValueScaled: string; // x100-scaled, as emitted on-chain
  thresholdValueScaled: string;
};

const ETH_TO_RUPEES = 1_000; // same demo conversion rate as services/explain.ts — not a real exchange rate

const MAX_ATTEMPTS = 3;

/** The one deterministic key idempotency is built on (Phase 11). */
function eventIdentifier(input: PayoutNotificationInput): string {
  return `${input.chainId}:${input.contractAddress.toLowerCase()}:${input.txHash.toLowerCase()}:${input.logIndex}`;
}

function formatMessage(input: PayoutNotificationInput, policyDisplayId: string): string {
  const eth = Number(ethers.formatEther(BigInt(input.amountWei)));
  const rupees = `₹${(eth * ETH_TO_RUPEES).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const consensusMm = Number(input.consensusValueScaled) / 100;
  const thresholdMm = Number(input.thresholdValueScaled) / 100;

  return (
    `KisanShield payout triggered.\n\n` +
    `Policy: ${policyDisplayId}\n` +
    `Payout: ${rupees}\n\n` +
    `Why:\n` +
    `Rainfall was ${consensusMm}mm, below your ${thresholdMm}mm threshold.\n\n` +
    `Status:\n` +
    `Payout initiated on a test network — this is a hackathon demo, not a real bank transfer.`
  );
}

async function alreadyProcessed(eventId: string, channel: string): Promise<boolean> {
  if (!supabaseAdmin) return false; // no record possible; caller still fails closed on send attempt
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("event_identifier", eventId)
    .eq("channel", channel)
    .maybeSingle();
  return data !== null;
}

async function recordAttempt(row: {
  eventId: string;
  channel: "whatsapp" | "sms" | "voice";
  policyId: number;
  farmerId: string | null;
  status: "SENT" | "FAILED" | "SKIPPED" | "RETRYING";
  providerMessageId?: string;
  attemptCount: number;
  errorCode?: string;
  errorMessage?: string;
}) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("notifications").upsert(
    {
      event_identifier: row.eventId,
      channel: row.channel,
      policy_id: row.policyId,
      farmer_id: row.farmerId,
      status: row.status,
      provider_message_id: row.providerMessageId ?? null,
      attempt_count: row.attemptCount,
      error_code: row.errorCode ?? null,
      error_message: row.errorMessage ?? null,
    },
    { onConflict: "event_identifier,channel" }
  );
}

/** Permanent failures never retry — matches Twilio's own error-code families for bad numbers/config. */
function isPermanentFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /not configured|invalid.*number|21211|21606|21408/i.test(message);
}

async function sendWithRetry(
  channel: "whatsapp" | "sms",
  to: string,
  body: string
): Promise<{ status: "SENT" | "FAILED"; providerMessageId?: string; error?: string; attempts: number }> {
  const send = channel === "whatsapp" ? sendWhatsapp : sendSms;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await send(to, body);
      return { status: "SENT", providerMessageId: result.sid, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (isPermanentFailure(err)) break;
      // Bounded, brief backoff — this is a demo notification path, not a queue worker.
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  return { status: "FAILED", error: message, attempts: MAX_ATTEMPTS };
}

/**
 * The entry point payoutListener.ts calls for every real PayoutTriggered
 * event. Never throws — a notification failure must never be mistaken for
 * a payout failure; the payout already happened on-chain regardless of
 * what happens here.
 */
export async function notifyPayout(input: PayoutNotificationInput): Promise<void> {
  const eventId = eventIdentifier(input);
  const policyDisplayId = `KS-${String(input.policyId).padStart(4, "0")}`;

  if (!supabaseAdmin) {
    console.error("[notificationRouter] Supabase not configured — cannot resolve farmer, skipping notification");
    return;
  }

  // Resolve farmer by policy_assignments -> farmers, never by on-chain
  // address (Phase 22: notification logic never touches wallet identity).
  const { data: assignment } = await supabaseAdmin
    .from("policy_assignments")
    .select("farmer_id, farmers(whatsapp_number, whatsapp_opt_in, phone, preferred_language)")
    .eq("policy_id", input.policyId)
    .maybeSingle();

  const farmer = (assignment as any)?.farmers as
    | {
        whatsapp_number: string | null;
        whatsapp_opt_in: boolean;
        phone: string | null;
        preferred_language: string | null;
      }
    | undefined;
  const farmerId = (assignment as any)?.farmer_id ?? null;

  if (!farmer) {
    console.error(`[notificationRouter] no farmer assigned to policy ${input.policyId} — skipping notification`);
    await recordAttempt({
      eventId,
      channel: "whatsapp",
      policyId: input.policyId,
      farmerId,
      status: "SKIPPED",
      attemptCount: 0,
      errorMessage: "No farmer assigned to this policy",
    });
    return;
  }

  const message = formatMessage(input, policyDisplayId);

  // --- WhatsApp ---
  if (await alreadyProcessed(eventId, "whatsapp")) {
    console.log(`[notificationRouter] whatsapp already processed for ${eventId}, skipping`);
  } else if (!farmer.whatsapp_number || !farmer.whatsapp_opt_in) {
    await recordAttempt({
      eventId,
      channel: "whatsapp",
      policyId: input.policyId,
      farmerId,
      status: "SKIPPED",
      attemptCount: 0,
      errorMessage: !farmer.whatsapp_number ? "No WhatsApp number on file" : "Farmer has not opted in",
    });
  } else if (!isWhatsappConfigured()) {
    await recordAttempt({
      eventId,
      channel: "whatsapp",
      policyId: input.policyId,
      farmerId,
      status: "SKIPPED",
      attemptCount: 0,
      errorMessage: "Twilio WhatsApp is not configured",
    });
  } else {
    const result = await sendWithRetry("whatsapp", farmer.whatsapp_number, message);
    await recordAttempt({
      eventId,
      channel: "whatsapp",
      policyId: input.policyId,
      farmerId,
      status: result.status,
      providerMessageId: result.providerMessageId,
      attemptCount: result.attempts,
      errorMessage: result.error,
    });

    // --- SMS fallback: only on an actual WhatsApp failure, never as a first choice ---
    if (result.status === "FAILED") {
      if (await alreadyProcessed(eventId, "sms")) {
        console.log(`[notificationRouter] sms already processed for ${eventId}, skipping`);
      } else if (!farmer.phone) {
        await recordAttempt({
          eventId,
          channel: "sms",
          policyId: input.policyId,
          farmerId,
          status: "SKIPPED",
          attemptCount: 0,
          errorMessage: "No phone number on file for SMS fallback",
        });
      } else if (!isSmsConfigured()) {
        await recordAttempt({
          eventId,
          channel: "sms",
          policyId: input.policyId,
          farmerId,
          status: "SKIPPED",
          attemptCount: 0,
          errorMessage: "Twilio SMS is not configured",
        });
      } else {
        const smsTo = farmer.phone.startsWith("+") ? farmer.phone : `+91${farmer.phone}`;
        const smsResult = await sendWithRetry("sms", smsTo, message);
        await recordAttempt({
          eventId,
          channel: "sms",
          policyId: input.policyId,
          farmerId,
          status: smsResult.status,
          providerMessageId: smsResult.providerMessageId,
          attemptCount: smsResult.attempts,
          errorMessage: smsResult.error,
        });
      }
    }
  }

  // --- Voice call: independent of the WhatsApp/SMS outcome above, always
  // attempted once per event when configured and a phone number exists.
  // Spoken in the farmer's preferred_language via Sarvam TTS — falls back
  // to English text if translation fails, same fail-open policy as the
  // ledger's own translateLedger().
  if (await alreadyProcessed(eventId, "voice")) {
    console.log(`[notificationRouter] voice already processed for ${eventId}, skipping`);
  } else if (!farmer.phone) {
    await recordAttempt({
      eventId,
      channel: "voice",
      policyId: input.policyId,
      farmerId,
      status: "SKIPPED",
      attemptCount: 0,
      errorMessage: "No phone number on file for voice call",
    });
  } else if (!isVoiceCallConfigured()) {
    await recordAttempt({
      eventId,
      channel: "voice",
      policyId: input.policyId,
      farmerId,
      status: "SKIPPED",
      attemptCount: 0,
      errorMessage: "Voice calling is not configured (Twilio Voice + Sarvam TTS + PUBLIC_BASE_URL required)",
    });
  } else {
    const voiceTo = farmer.phone.startsWith("+") ? farmer.phone : `+91${farmer.phone}`;
    const language = (["hi", "mr"].includes(farmer.preferred_language ?? "")
      ? farmer.preferred_language
      : "en") as SupportedLanguage | "en";

    let spokenText = message;
    if (language !== "en" && isSarvamConfigured()) {
      try {
        spokenText = await translateText(message, language);
      } catch (err) {
        const errMessage = err instanceof SarvamError ? err.message : String(err);
        console.error(`[notificationRouter] voice script translation failed, using English: ${errMessage}`);
      }
    }

    try {
      const call = await placeVoiceCall(voiceTo, spokenText, language === "en" ? "en" : language);
      await recordAttempt({
        eventId,
        channel: "voice",
        policyId: input.policyId,
        farmerId,
        status: "SENT",
        providerMessageId: call.sid,
        attemptCount: 1,
      });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      await recordAttempt({
        eventId,
        channel: "voice",
        policyId: input.policyId,
        farmerId,
        status: "FAILED",
        attemptCount: 1,
        errorMessage: errMessage,
      });
    }
  }
}
