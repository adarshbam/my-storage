import { rzInstance } from "../config/config.js";
import Plan from "../models/planModel.js";

export const createPlan = async (req, res, next) => {
  const { type, amount, storage } = req.body;
  try {
    const existingPlan = await Plan.findOne({ type, amount });

    if (existingPlan) {
      existingPlan.updateOne({
        active: true,
      });
      res.json({
        planId: existingPlan.razorpayPlanId,
      });
    }

    const newPlan = await rzInstance.plans.create(
        
    );

    const subscription = await Plan.create({
      razorpaySubscriptionId: newPlan.id,
      userId: req.user.id,
    });

    console.log("[Subscription] Created:", subscription.razorpaySubscriptionId);

    return res.json({
      plan: newPlan.id,
    });
  } catch (err) {
    console.error("[Subscription] Error:", err.message);
    next(err);
  }
};
