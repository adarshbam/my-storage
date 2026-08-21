import Subscription from "../../../models/subscriptionModel.js";
import User from "../../../models/userModel.js";
import { subscriptionCancelled } from "../../../services/notification.service.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";

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

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: entity.id,
  });

  if (subscription) {
    const now = new Date();
    subscription.status = "cancelled";
    subscription.cancelledAt = now;
    subscription.cancelledBy = entity.cancelled_by || subscription.cancelledBy || "user";
    if (entity.ended_at) {
      subscription.expiredAt = new Date(entity.ended_at * 1000);
    }
    if (entity.current_end) {
      subscription.currentEnd = new Date(entity.current_end * 1000);
    }
    await subscription.save();

    // Check if the current paid cycle has already ended
    const cycleEnded = !subscription.currentEnd || subscription.currentEnd <= now;
    if (cycleEnded) {
      await User.findByIdAndUpdate(subscription.userId, {
        $set: { noSubscriptionSince: now, noPlanSince: now },
      });
    }

    await invalidatePlanContextCache(subscription.userId);
    console.log(
      `[Webhook] User ${subscription.userId} subscription cancelled successfully.`,
    );

    // Trigger notification
    await subscriptionCancelled({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      retentionDays: 30,
    }).catch((nErr) => {
      console.warn("[Webhook] Notification error:", nErr.message);
    });
  }
}
