import Subscription from "../../../models/subscriptionModel.js";
import { subscriptionPaused } from "../../../services/notification.service.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";

export async function handleSubscriptionPaused(payload) {
  const entity =
    payload.payload?.subscription?.entity ||
    payload.subscription?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn("[Webhook] subscription.paused: missing subscription entity");
    return;
  }

  console.log(`[Webhook] subscription.paused for ${entity.id}`);

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: { status: "paused", pausedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!subscription)
    console.warn(
      "[Webhook] subscription.paused: missing subscription in the database",
    );

  if (subscription) {
    await invalidatePlanContextCache(subscription.userId);
    await subscriptionPaused({
      userId: subscription.userId,
      subscriptionId: subscription._id,
    }).catch((nErr) => {
      console.warn("[Webhook] Notification error:", nErr.message);
    });
  }
}
