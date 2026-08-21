import Subscription from "../../../models/subscriptionModel.js";
import { paymentSucceeded } from "../../../services/notification.service.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";

/**
 * Handles invoice.paid event emitted by Razorpay when an invoice is successfully settled.
 */
export async function handleInvoicePaid(payload) {
  const entity =
    payload.payload?.invoice?.entity ||
    payload.invoice?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn("[Webhook] invoice.paid: missing invoice entity");
    return;
  }

  console.log(`[Webhook] invoice.paid for invoice ${entity.id}`);

  let subscription = null;
  if (entity.subscription_id) {
    subscription = await Subscription.findOne({
      razorpaySubscriptionId: entity.subscription_id,
    });
  }

  if (subscription) {
    await invalidatePlanContextCache(subscription.userId);
    await paymentSucceeded({
      userId: subscription.userId,
      paymentId: entity.payment_id || entity.id,
      amount: (entity.amount_paid || entity.amount || 0) / 100,
      currency: entity.currency || "INR",
    }).catch((nErr) => {
      console.warn("[Webhook] invoice.paid notification error:", nErr.message);
    });
  }
}
