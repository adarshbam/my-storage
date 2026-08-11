import Razorpay from "razorpay";
import { dispatchRazorpayEvent } from "./razorpay.webhook.service.js";

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    console.log(req.headers);

    const isSignatureValid = Razorpay.validateWebhookSignature(
      JSON.stringify(req.body),
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET,
    );

    if (!isSignatureValid) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid webhook signature" });
    }

    const eventType = req.body.event;
    console.log("[Webhook] Received Razorpay event:", eventType);

    await dispatchRazorpayEvent(eventType, req.body);

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[Webhook] Error:", err.message);
    next(err);
  }
};
