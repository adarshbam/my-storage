import Razorpay from "razorpay";
import { dispatchRazorpayEvent } from "./razorpay.webhook.service.js";
import WebhookEvent from "../../models/webhookEventModel.js";

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.warn("[Webhook] Missing signature or webhook secret");
      return res
        .status(400)
        .json({ status: "error", message: "Missing webhook signature or secret" });
    }

    const payloadBuffer = req.rawBody || JSON.stringify(req.body);
    const isSignatureValid = Razorpay.validateWebhookSignature(
      payloadBuffer,
      signature,
      webhookSecret,
    );

    if (!isSignatureValid) {
      console.warn("[Webhook] Invalid signature received");
      return res
        .status(400)
        .json({ status: "error", message: "Invalid webhook signature" });
    }

    const { event, contains, payload } = req.body;
    const eventId =
      req.headers["x-razorpay-event-id"] ||
      req.body.event_id ||
      `${event}_${payload?.subscription?.entity?.id || payload?.payment?.entity?.id || Date.now()}`;

    // 2. Atomic Idempotency Guard
    try {
      await WebhookEvent.create({
        eventId,
        event,
        entity: contains?.[0] || "subscription",
        payload,
        processed: false,
      });
    } catch (err) {
      if (err.code === 11000) {
        console.warn(`[Webhook] Duplicate event ${eventId} ignored.`);
        return res.status(200).json({ status: "already_processed" });
      }
      throw err;
    }

    console.log(`[Webhook] Processing Razorpay event: ${event} (${eventId})`);

    await dispatchRazorpayEvent(event, req.body);

    // Mark event as processed
    await WebhookEvent.updateOne({ eventId }, { $set: { processed: true } });

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[Webhook] Processing Error:", err.message);
    next(err);
  }
};
