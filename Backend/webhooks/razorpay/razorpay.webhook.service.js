import { handlePaymentCaptured } from "./handlers/payment.captured.handler.js";
import { handlePaymentFailed } from "./handlers/payment.failed.handler.js";
import { handleSubscriptionActivated } from "./handlers/subscription.activated.handler.js";
import { handleSubscriptionPending } from "./handlers/subscription.pending.handler.js";
import { handleSubscriptionHalted } from "./handlers/subscription.halted.handler.js";
import { handleSubscriptionCancelled } from "./handlers/subscription.cancelled.handler.js";
import { handleSubscriptionPaused } from "./handlers/subscription.paused.handler.js";
import { handleSubscriptionResumed } from "./handlers/subscription.resumed.handler.js";

export const dispatchRazorpayEvent = async (eventType, payload) => {
  switch (eventType) {
    case "payment.captured":
    case "checkout.payment.captured":
      await handlePaymentCaptured(payload);
      break;
    case "payment.failed":
      await handlePaymentFailed(payload);
      break;
    case "subscription.activated":
      await handleSubscriptionActivated(payload);
      break;
    case "subscription.pending":
      await handleSubscriptionPending(payload);
      break;
    case "subscription.halted":
      await handleSubscriptionHalted(payload);
      break;
    case "subscription.cancelled":
      await handleSubscriptionCancelled(payload);
      break;
    case "subscription.paused":
      await handleSubscriptionPaused(payload);
      break;
    case "subscription.resumed":
      await handleSubscriptionResumed(payload);
      break;
    default:
      console.log(`[Webhook] Unhandled Razorpay event type: ${eventType}`);
      break;
  }
};
