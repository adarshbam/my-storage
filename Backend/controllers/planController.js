import { rzInstance } from "../config/config.js";
import BillingPlan from "../models/billingPlanModel.js";

export const createPlan = async (req, res, next) => {
  const { type, amount, storage, period, currency } = req.body;

  console.log(req.body);

  if (req.user.role != "Owner")
    return res.status(403).json("You are forbidden to perform this action");

  try {
    const planCurrency = (currency || "INR").toUpperCase();
    const existingPlan = await Plan.findOne({
      type,
      amount,
      period,
    });
    console.log(existingPlan);

    if (existingPlan) {
      const disablingPlans = await Plan.updateMany(
        {
          type,
          period,
        },
        {
          active: false,
        },
      );

      await existingPlan.updateOne({
        storage,
        active: true,
      });

      return res.json({
        planId: existingPlan.razorpayPlanId,
      });
    }

    // Convert amount to subunit for Razorpay (e.g. paise for INR, cents for USD)
    const zeroDecimalCurrencies = ["JPY", "KRW"];
    const rzAmount = zeroDecimalCurrencies.includes(planCurrency)
      ? Math.round(amount)
      : Math.round(amount * 100);

    console.log(rzAmount, planCurrency);

    const newPlan = await rzInstance.plans.create({
      period: period.toLowerCase(),
      interval: 1,
      item: {
        name: `${type} - ${period}`,
        amount: rzAmount,
        currency: "INR",
      },
    });

    console.log(newPlan);

    console.log(type, period);

    const disablingPlans = await Plan.updateMany(
      {
        type,
        period,
      },
      {
        active: false,
      },
    );

    console.log(disablingPlans);

    const plan = await Plan.create({
      razorpayPlanId: newPlan.id,
      type,
      amount,
      currency: planCurrency,
      period,
      storage,
    });

    console.log("[Plan] Created:", plan.razorpayPlanId);

    return res.json({
      plan: plan.razorpayPlanId,
    });
  } catch (err) {
    console.error("[Plan] Error:", err?.error || err?.message || err);
    next(err);
  }
};

export const getAllActivePlans = async (req, res, next) => {
  try {
    const existingActivePlans = await BillingPlan.find({ active: true });
    console.log(existingActivePlans);

    return res.json(existingActivePlans);
  } catch (err) {
    console.error("[Plan] Error:", err.message);
    next(err);
  }
};
