import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";
import { rzInstance } from "../config/config.js";

export const createSubscription = async (req, res, next) => {
  const { planId } = req.body;
  try {
    const newSubscription = await rzInstance.subscriptions.create({
      plan_id: planId,
      total_count: 120,
      notes: {
        userId: req.user.id,
      },
    });

    if (!newSubscription) {
      return res.status(404).json({ message: "Subscription not created" });
    }

    const subscription = await Subscription.create({
      razorpaySubscriptionId: newSubscription.id,
      userId: req.user.id,
    });

    console.log("[Subscription] Created:", subscription.razorpaySubscriptionId);

    return res.json({
      subscriptionId: newSubscription.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[Subscription] Error:", err.message);
    next(err);
  }
};
