import Subscription from "../../../models/subscriptionModel.js";
import User from "../../../models/userModel.js";

export async function handleSubscriptionActivated(payload) {
  const entity =
    payload.payload?.subscription?.entity ||
    payload.subscription?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn(
      "[Webhook] subscription.activated: missing subscription entity",
    );
    return;
  }

  console.log(`[Webhook] subscription.activated for ${entity.id}`);

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: { status: "active" } },
    { new: true },
  ).populate("billingPlan");

  if (subscription) {
    const updateData = {
      subscription: subscription._id,
      noSubscriptionSince: null,
      noPlanSince: null,
    };
    if (subscription.billingPlan?.storage) {
      updateData.maxStorage = subscription.billingPlan.storage;
    }
    await User.findByIdAndUpdate(subscription.userId, { $set: updateData });
    console.log(
      `[Webhook] User ${subscription.userId} subscription activated successfully.`,
    );
  }
}
