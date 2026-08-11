import Razorpay from "razorpay";
import User from "../../../models/userModel.js";

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
  const { id, plan_id } = payload.payload?.payment?.entity || {};
  if (id) {
    try {
      const payment = await Razorpay.payments.fetch(id);
      const email = payment.email;
      if (email && PLANS[plan_id]?.maxStorage) {
        await User.findOneAndUpdate(
          { email },
          { $set: { maxStorage: PLANS[plan_id].maxStorage } },
        );
      }
    } catch (e) {
      console.warn("[Webhook] Payment fetch note:", e.message);
    }
  }
  // TODO: Implement comprehensive payment capture, invoice generation & DB log
};
