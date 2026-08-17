import Razorpay from "razorpay";
import User from "../../../models/userModel.js";
import { paymentSucceeded } from "../../../services/notification.service.js";

export const PLANS = {
  plan_TCC4EtSVu7anNx: {
    maxStorage: 1099511627776, // 1TB
  },
  plan_TD10msXSXeCock: {
    maxStorage: 5497558138880, // 5TB
  },
  plan_TCC7yJR64OKj7M: {
    maxStorage: 16492674416640, // 15TB
  },
  plan_TCC8m4UWWy28DX: {
    maxStorage: 1099511627776, // 1TB
  },
  plan_TCC9kiG9hIPkoG: {
    maxStorage: 5497558138880, // 5TB
  },
  plan_TCCA63CvmRzF7D: {
    maxStorage: 16492674416640, // 15TB
  },
};

export const handlePaymentCaptured = async (payload) => {
  const { id, plan_id, notes, amount, currency } =
    payload.payload?.payment?.entity || {};
  if (id) {
    try {
      let user = null;
      if (notes?.userId) {
        user = await User.findById(notes.userId);
      }

      const payment = await Razorpay.payments?.fetch(id).catch(() => null);
      const email = payment?.email;

      if (!user && email) {
        user = await User.findOne({ email });
      }

      if (user && PLANS[plan_id]?.maxStorage) {
        user.maxStorage = PLANS[plan_id].maxStorage;
        await user.save();
      }

      if (user) {
        await paymentSucceeded({
          userId: user._id,
          paymentId: id,
          amount: amount || payment?.amount || 0,
          currency: currency || payment?.currency || "INR",
        }).catch((nErr) => {
          console.warn("[Webhook] Payment success notification error:", nErr.message);
        });
      }
    } catch (e) {
      console.warn("[Webhook] Payment fetch note:", e.message);
    }
  }
};
