import { rzInstance } from "../../../integrations/razorpay/razorpay.client.js";
import Subscription from "../../../models/subscriptionModel.js";
import User from "../../../models/userModel.js";
import { subscriptionActivated } from "../../../services/notification.service.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";
import { withTransaction } from "../../../utils/transaction.js";

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

  let subscription = null;
  await withTransaction(async (session) => {
    subscription = await Subscription.findOneAndUpdate(
      { razorpaySubscriptionId: entity.id },
      { $set: subUpdate },
      { returnDocument: "after", session },
    ).populate("billingPlan");

    if (!subscription) {
      return;
    }

    await Subscription.updateMany(
      {
        userId: subscription.userId,
        status: { $in: ["active", "paused"] },
        _id: { $ne: subscription._id },
      },
      {
        $set: {
          status: "cancelled",
          cancellationReason: "system",
        },
      },
      { session },
    );

    const updateData = {
      subscription: subscription._id,
      billingPlan: subscription.billingPlan?._id || subscription.billingPlan,
      noSubscriptionSince: null,
      noPlanSince: null,
    };

    if (subscription.billingPlan?.storage) {
      updateData.maxStorage = subscription.billingPlan.storage;
    }

    await User.findByIdAndUpdate(subscription.userId, { $set: updateData }, { session });
  });

  if (!subscription) {
    console.warn(
      `[Webhook] subscription.activated: subscription ${entity.id} not found`,
    );
    return;
  }

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
