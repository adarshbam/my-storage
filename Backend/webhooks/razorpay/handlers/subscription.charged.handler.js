import Subscription from "../../../models/subscriptionModel.js";
import User from "../../../models/userModel.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";
import { paymentSucceeded } from "../../../services/notification.service.js";

/**
 * Handles subscription.charged event emitted by Razorpay upon successful recurring billing cycle debit.
 */
export async function handleSubscriptionCharged(payload) {
  const entity =
    payload.payload?.subscription?.entity ||
    payload.subscription?.entity ||
    payload.entity;

  const paymentEntity =
    payload.payload?.payment?.entity ||
    payload.payment?.entity;

  if (!entity || !entity.id) {
    console.warn("[Webhook] subscription.charged: missing subscription entity");
    return;
  }

  console.log(`[Webhook] subscription.charged for ${entity.id}`);

  const updateData = {
    status: "active",
    paidCount: entity.paid_count || 1,
    remainingCount: entity.remaining_count,
  };

  if (entity.current_start) {
    updateData.currentStart = new Date(entity.current_start * 1000);
  }
  if (entity.current_end) {
    updateData.currentEnd = new Date(entity.current_end * 1000);
  }
  if (entity.charge_at) {
    updateData.chargeAt = new Date(entity.charge_at * 1000);
  }

  const subscription = await Subscription.findOneAndUpdate(
    { razorpaySubscriptionId: entity.id },
    { $set: updateData },
    { returnDocument: "after" },
  ).populate("billingPlan");

  if (subscription) {
    // Refresh User maxStorage & clear no-subscription markers
    const userUpdate = {
      subscription: subscription._id,
      noSubscriptionSince: null,
      noPlanSince: null,
    };
    if (subscription.billingPlan?.storage) {
      userUpdate.maxStorage = subscription.billingPlan.storage;
    }
    await User.findByIdAndUpdate(subscription.userId, { $set: userUpdate });
    await invalidatePlanContextCache(subscription.userId);

    // Trigger payment success notification
    if (paymentEntity?.id) {
      await paymentSucceeded({
        userId: subscription.userId,
        paymentId: paymentEntity.id,
        amount: (paymentEntity.amount || entity.amount || 0) / 100,
        currency: paymentEntity.currency || "INR",
      }).catch((nErr) => {
        console.warn("[Webhook] Notification error:", nErr.message);
      });
    }
  }
}
