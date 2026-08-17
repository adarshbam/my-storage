import Subscription from "../../../models/subscriptionModel.js";
import { subscriptionPaused } from "../../../services/notification.service.js";

export async function handleSubscriptionPaused(payload) {
  const entity =
    payload.payload?.subscription?.entity ||
    payload.subscription?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn(
      "[Webhook] subscription.paused: missing subscription entity",
    );
    return;
  }

  console.log(`[Webhook] subscription.paused for ${entity.id}`);

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: { status: "paused" } },
    { new: true },
  );

  if (subscription) {
    await subscriptionPaused({
      userId: subscription.userId,
      subscriptionId: subscription._id,
    }).catch((nErr) => {
      console.warn("[Webhook] Notification error:", nErr.message);
    });
  }
}
