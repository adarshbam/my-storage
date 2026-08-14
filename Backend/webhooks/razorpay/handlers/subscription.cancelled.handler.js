import Subscription from "../../../models/subscriptionModel.js";
import User from "../../../models/userModel.js";

export async function handleSubscriptionCancelled(payload) {
  const entity =
    payload.payload?.subscription?.entity ||
    payload.subscription?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn(
      "[Webhook] subscription.cancelled: missing subscription entity",
    );
    return;
  }

  console.log(`[Webhook] subscription.cancelled for ${entity.id}`);

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: { status: "cancelled" } },
    { new: true },
  );

  if (subscription) {
    const now = new Date();
    await User.findByIdAndUpdate(subscription.userId, {
      $set: { noSubscriptionSince: now, noPlanSince: now },
    });
    console.log(
      `[Webhook] User ${subscription.userId} subscription cancelled.`,
    );
  }
}
