import { rzInstance } from "../config/config.js";
import Plan from "../models/planModel.js";

export const createPlan = async (req, res, next) => {
  const { type, amount, storage, period, currency } = req.body;

  if (req.user.role != "Owner")
    return res.status(403).json("You are forbidden to perform this action");

  try {
    const existingPlan = await Plan.findOne({ type, amount, period });

    if (existingPlan) {
      existingPlan.updateOne({
        storage,
        active: true,
      });
      return res.json({
        planId: existingPlan._id,
      });
    }

    const newPlan = await rzInstance.plans.create({
      period,
      interval: 1,
      item: {
        name: `${type} - ${period}`,
        amount,
        currency,
      },
    });

    console.log(newPlan);

    const plan = await Plan.create({
      _id: newPlan.id,
      type,
      amount,
      currency,
      period,
      storage,
      currency,
    });

    console.log("[Plan] Created:", plan._id);

    return res.json({
      plan: plan._id,
    });
  } catch (err) {
    console.error("[Plan] Error:", err.message);
    next(err);
  }
};

export const getCurrentActivePlan = async (req, res, next) => {
  const { type, period } = req.body;

  try {
    const existingPlan = await Plan.findOne({ type, period, active: true });

    if (!existingPlan) {
      return res.status(404).json("Plan doesn't exist");
    }

    return res.json({
      planId: existingPlan._id,
    });
  } catch (err) {
    console.error("[Plan] Error:", err.message);
    next(err);
  }
};
