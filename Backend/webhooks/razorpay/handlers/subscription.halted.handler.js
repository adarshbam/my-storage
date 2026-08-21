import Subscription from "../../../models/subscriptionModel.js";
import User from "../../../models/userModel.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";
import { createNotificationLogic } from "../../../services/notification.service.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_SEVERITIES,
} from "../../../constants/notification.constants.js";

/**
 * Handles subscription.halted event emitted by Razorpay when all retry attempts fail and subscription is halted.
 */
export async function handleSubscriptionHalted(payload) {
  const entity =
    payload.payload?.subscription?.entity ||
    payload.subscription?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn("[Webhook] subscription.halted: missing subscription entity");
    return;
  }

  console.log(`[Webhook] subscription.halted for ${entity.id}`);

  const now = new Date();
  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: { status: "halted", haltedAt: now } },
    { returnDocument: "after" },
  );

  if (subscription) {
    // Start grace period for user
    await User.findByIdAndUpdate(subscription.userId, {
      $set: { noSubscriptionSince: now, noPlanSince: now },
    });
    await invalidatePlanContextCache(subscription.userId);

    // Send critical alert notification
    await createNotificationLogic({
      userId: subscription.userId,
      type: NOTIFICATION_TYPES.BILLING,
      severity: NOTIFICATION_SEVERITIES.CRITICAL,
      title: "Subscription Halted",
      message:
        "Your recurring payment failed all retry attempts. Your subscription has been halted and your vault is now in read-only mode.",
      action: {
        label: "Update Payment Method",
        route: "/dashboard/billing",
      },
      eventKey: `sub-halted:${subscription._id}`,
      metadata: { subscriptionId: subscription._id },
    }).catch((nErr) => {
      console.warn("[Webhook] Notification error:", nErr.message);
    });
  }
}
