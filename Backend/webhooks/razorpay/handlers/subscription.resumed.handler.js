import Subscription from "../../../models/subscriptionModel.js";
import { subscriptionResumed } from "../../../services/notification.service.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";

export async function handleSubscriptionResumed(payload) {
  const entity =
    payload.payload?.subscription?.entity ||
    payload.subscription?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn("[Webhook] subscription.resumed: missing subscription entity");
    return;
  }

  console.log(`[Webhook] subscription.resumed for ${entity.id}`);

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: { status: "active", resumedAt: new Date(), pausedAt: null } },
    { returnDocument: "after" },
  );

  if (subscription) {
    await invalidatePlanContextCache(subscription.userId);
    await subscriptionResumed({
      userId: subscription.userId,
      subscriptionId: subscription._id,
    }).catch((nErr) => {
      console.warn("[Webhook] Notification error:", nErr.message);
    });
  }
}
