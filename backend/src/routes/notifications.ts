import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { config } from "../config.js";
import { isTwilioConfigured, isWhatsappConfigured, isSmsConfigured, sendWhatsapp } from "../services/twilio.js";
import { isVoiceCallConfigured, placeVoiceCall } from "./voiceCall.js";

export const notificationsRouter = Router();

/**
 * GET /api/notifications/health — safe configuration booleans only, no
 * credentials, no send attempt. Unauthenticated: this is status
 * information, not an action, and matches the shape health checks
 * elsewhere in this app (GET /api/health) which are also open.
 */
notificationsRouter.get("/health", (_req, res) => {
  res.json({
    twilioConfigured: isTwilioConfigured(),
    whatsappConfigured: isWhatsappConfigured(),
    smsConfigured: isSmsConfigured(),
    voiceConfigured: isVoiceCallConfigured(),
  });
});

/**
 * POST /api/notifications/test-whatsapp — insurer/admin only. Sends only
 * to the one fixed NOTIFICATION_TEST_RECIPIENT configured in backend/.env;
 * cannot accept a destination from the request body under any
 * circumstance (Phase 14's explicit requirement).
 */
notificationsRouter.post(
  "/test-whatsapp",
  requireAuth,
  requireRole("insurer", "admin"),
  async (_req, res) => {
    if (!config.notificationTestRecipient) {
      return res.status(503).json({ error: "NOTIFICATION_TEST_RECIPIENT is not configured" });
    }
    if (!isWhatsappConfigured()) {
      return res.status(503).json({ error: "Twilio WhatsApp is not configured" });
    }

    try {
      const result = await sendWhatsapp(
        config.notificationTestRecipient,
        "[TEST] KisanShield notification system check — if you received this, WhatsApp delivery is working."
      );
      res.json({ success: true, status: result.status, providerMessageId: result.sid });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ success: false, error: message });
    }
  }
);

/**
 * POST /api/notifications/test-voice-call — insurer/admin only. Places a
 * real outbound call to the one fixed NOTIFICATION_TEST_RECIPIENT, same
 * destination restriction as test-whatsapp above. Optional body.language
 * ("en"/"hi"/"mr") lets a demo exercise Sarvam's multilingual TTS.
 */
notificationsRouter.post(
  "/test-voice-call",
  requireAuth,
  requireRole("insurer", "admin"),
  async (req, res) => {
    if (!config.notificationTestRecipient) {
      return res.status(503).json({ error: "NOTIFICATION_TEST_RECIPIENT is not configured" });
    }
    if (!isVoiceCallConfigured()) {
      return res.status(503).json({
        error: "Voice calling is not configured (Twilio Voice + Sarvam TTS + PUBLIC_BASE_URL required)",
      });
    }

    const language = ["en", "hi", "mr"].includes(req.body?.language) ? req.body.language : "en";
    const scripts: Record<string, string> = {
      en: "This is a test call from KisanShield. If you can hear this, voice notifications are working.",
      hi: "यह किसानशील्ड की ओर से एक परीक्षण कॉल है। यदि आप इसे सुन सकते हैं, तो आवाज़ सूचनाएं काम कर रही हैं।",
      mr: "ही किसानशील्डकडून एक चाचणी कॉल आहे. जर तुम्हाला हे ऐकू येत असेल, तर आवाज सूचना सुरळीत सुरू आहेत.",
    };

    try {
      const result = await placeVoiceCall(config.notificationTestRecipient, scripts[language], language as any);
      res.json({ success: true, status: result.status, providerCallSid: result.sid });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ success: false, error: message });
    }
  }
);
