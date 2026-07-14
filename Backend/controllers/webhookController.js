import Razorpay from "razorpay";
import User from "../models/userModel.js";

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

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    console.log(req.headers);

    const isSignatureValid = Razorpay.validateWebhookSignature(
      JSON.stringify(req.body),
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET,
    );

    if (!isSignatureValid) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid webhook signature" });
    }

    if (req.body.event === "checkout.payment.captured") {
      const { id, amount, currency, plan_id } = req.body.payload.payment.entity;
      console.log(id, amount, currency, plan_id);
      const payment = await Razorpay.payments.fetch(id);
      const email = payment.email;

      const user = await User.findOneAndUpdate(
        { email: email },
        {
          $set: {
            maxStorage: PLANS[plan_id]?.maxStorage,
          },
        },
        { new: true },
      );

      console.log("Updated user storage:", user?.maxStorage);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[Webhook] Error:", err.message);
    next(err);
  }
};
