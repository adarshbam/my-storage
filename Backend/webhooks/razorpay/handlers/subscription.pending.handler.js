import Subscription from "../../../models/subscriptionModel.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";
import { createNotificationLogic } from "../../../services/notification.service.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_SEVERITIES,
} from "../../../constants/notification.constants.js";

/**
 * Handles subscription.pending event emitted by Razorpay when an automated charge fails and retry is scheduled.
 */
export async function handleSubscriptionPending(payload) {
  const entity =
    payload.payload?.subscription?.entity ||
    payload.subscription?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn("[Webhook] subscription.pending: missing subscription entity");
    return;
  }

  console.log(`[Webhook] subscription.pending for ${entity.id}`);

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: { status: "pending" } },
    { returnDocument: "after" },
  );

  if (subscription) {
    await invalidatePlanContextCache(subscription.userId);

    // Send a warning notification
    await createNotificationLogic({
      userId: subscription.userId,
      type: NOTIFICATION_TYPES.BILLING,
      severity: NOTIFICATION_SEVERITIES.WARNING,
      title: "Subscription Payment Pending",
      message:
        "Your recent subscription payment attempt failed. Razorpay will retry shortly. Please verify your payment method.",
      action: {
        label: "Manage Billing",
        route: "/dashboard/billing",
      },
      eventKey: `sub-pending:${subscription._id}`,
      metadata: { subscriptionId: subscription._id },
    }).catch((nErr) => {
      console.warn("[Webhook] Notification error:", nErr.message);
    });
  }
}
