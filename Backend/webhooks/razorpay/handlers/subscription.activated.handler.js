import { rzInstance } from "../../../integrations/razorpay/razorpay.client.js";
import Subscription from "../../../models/subscriptionModel.js";
import User from "../../../models/userModel.js";
import { subscriptionActivated } from "../../../services/notification.service.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";

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

  const now = new Date();
  const subUpdate = {
    status: "active",
    activatedAt: now,
    purchasedAt: now,
    paidCount: entity.paid_count || 1,
    remainingCount: entity.remaining_count,
    totalCount: entity.total_count,
  };

  if (entity.current_start) {
    subUpdate.currentStart = new Date(entity.current_start * 1000);
  }
  if (entity.current_end) {
    subUpdate.currentEnd = new Date(entity.current_end * 1000);
  }
  if (entity.charge_at) {
    subUpdate.chargeAt = new Date(entity.charge_at * 1000);
  }

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: subUpdate },
    { returnDocument: "after" },
  ).populate("billingPlan");

  if (!subscription) {
    console.warn(
      `[Webhook] subscription.activated: subscription ${entity.id} not found`,
    );
    return;
  }

  const previousActiveSubcriptions = await Subscription.find({
    userId: subscription.userId,
    status: { $in: ["active", "paused"] },
    _id: { $ne: subscription._id },
  });

  for (const previousSubscription of previousActiveSubcriptions) {
    try {
      await rzInstance.subscriptions.cancel(
        previousSubscription.razorpaySubscriptionId,
        false,
      );
    } catch (cancelErr) {
      console.warn(
        `[Webhook] Failed to cancel previous subscription ${previousSubscription.razorpaySubscriptionId}:`,
        cancelErr.message,
      );
    }

    previousSubscription.status = "cancelled";
    previousSubscription.cancellationReason = "system";
    await previousSubscription.save();
  }

  if (subscription) {
    const updateData = {
      subscription: subscription._id,
      billingPlan: subscription.billingPlan?._id || subscription.billingPlan,
      noSubscriptionSince: null,
      noPlanSince: null,
    };

    if (subscription.billingPlan?.storage) {
      updateData.maxStorage = subscription.billingPlan.storage;
    }
    await User.findByIdAndUpdate(subscription.userId, { $set: updateData });
    await invalidatePlanContextCache(subscription.userId);
    console.log(
      `[Webhook] User ${subscription.userId} subscription activated successfully.`,
    );

    // Trigger notification and resolve past cancellation/deletion warnings
    await subscriptionActivated({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      planName: subscription.billingPlan?.slug
        ? subscription.billingPlan.slug.toUpperCase()
        : "Vault Storage Plan",
    }).catch((nErr) => {
      console.warn("[Webhook] Notification error:", nErr.message);
    });
  }
}
