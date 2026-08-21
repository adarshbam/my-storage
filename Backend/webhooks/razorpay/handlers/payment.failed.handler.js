import User from "../../../models/userModel.js";
import { paymentFailed } from "../../../services/notification.service.js";

export async function handlePaymentFailed(payload) {
  const entity =
    payload.payload?.payment?.entity ||
    payload.payment?.entity ||
    payload.entity;

  if (!entity || !entity.id) {
    console.warn("[Webhook] payment.failed: missing payment entity");
    return;
  }

  console.log(`[Webhook] payment.failed for ${entity.id}`);

  let user = null;
  if (entity.notes?.userId) {
    user = await User.findById(entity.notes.userId);
  }
  if (!user && entity.email) {
    user = await User.findOne({ email: entity.email });
  }

  if (user) {
    await paymentFailed({
      userId: user._id,
      paymentId: entity.id,
      reason:
        entity.error_description ||
        entity.error_reason ||
        "Transaction declined",
    }).catch((nErr) => {
      console.warn(
        "[Webhook] Payment failure notification error:",
        nErr.message,
      );
    });
  }
}
