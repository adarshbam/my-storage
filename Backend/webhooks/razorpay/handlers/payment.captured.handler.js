import { rzInstance } from "../../../integrations/razorpay/razorpay.client.js";
import User from "../../../models/userModel.js";
import { paymentSucceeded } from "../../../services/notification.service.js";
import BillingPlan from "../../../models/billingPlanModel.js";
import { invalidatePlanContextCache } from "../../../middlewares/loadPlanContext.js";

/**
 * Handles payment.captured and checkout.payment.captured events.
 */
export const handlePaymentCaptured = async (payload) => {
  const entity =
    payload.payload?.payment?.entity ||
    payload.payment?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    return;
  }

  const { id, notes, amount, currency } = entity;

  try {
    let user = null;

    if (notes?.userId) {
      user = await User.findById(notes.userId);
    }

    if (!user && entity.email) {
      user = await User.findOne({ email: entity.email });
    }

    if (user) {
      if (notes?.planId) {
        const plan = await BillingPlan.findById(notes.planId);
        if (plan?.storage) {
          user.maxStorage = plan.storage;
          await user.save();
          await invalidatePlanContextCache(user._id);
        }
      }

      await paymentSucceeded({
        userId: user._id,
        paymentId: id,
        amount: (amount || 0) / 100,
        currency: currency || "INR",
      }).catch((nErr) => {
        console.warn("[Webhook] Payment success notification error:", nErr.message);
      });
    }
  } catch (err) {
    console.warn("[Webhook] Payment captured processing error:", err.message);
  }
};
