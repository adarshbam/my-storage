import mongoose from "mongoose";
import { rzInstance } from "../integrations/razorpay/razorpay.client.js";
import Subscription from "../models/subscriptionModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import User from "../models/userModel.js";
import {
  subscriptionActivated,
  subscriptionCancelled,
  subscriptionPaused,
  subscriptionResumed,
} from "./notification.service.js";

export const createSubscriptionLogic = async ({ planId, userId }) => {
  const billingPlan =
    (mongoose.Types.ObjectId.isValid(planId) &&
      (await BillingPlan.findById(planId))) ||
    (await BillingPlan.findOne({ razorpayPlanId: planId }));

  if (!billingPlan) {
    throw Object.assign(new Error("Billing plan not found"), { status: 404 });
  }

  const newSubscription = await rzInstance.subscriptions.create({
    plan_id: billingPlan?.razorpayPlanId || planId,
    total_count: 120,
    notes: { userId: userId.toString() },
  });

  if (!newSubscription) {
    throw Object.assign(new Error("Subscription not created"), { status: 404 });
  }

  const subscription = await Subscription.create({
    razorpaySubscriptionId: newSubscription.id,
    userId: userId,
    billingPlan: billingPlan._id,
    amount: billingPlan.amount || 0,
    status: "created",
  });

  // Link Subscription to User and update user limits
  await User.findByIdAndUpdate(userId, {
    $set: {
      subscription: subscription._id,
      noSubscriptionSince: null,
      noPlanSince: null,
      ...(billingPlan.storage ? { maxStorage: billingPlan.storage } : {}),
    },
  });

  console.log(
    "[Subscription] Created and linked to user:",
    subscription.razorpaySubscriptionId,
  );

  // Trigger subscription activated notification and resolve past warnings
  await subscriptionActivated({
    userId,
    subscriptionId: subscription._id,
    planName: billingPlan.slug ? billingPlan.slug.toUpperCase() : "Storage Plan",
  }).catch((nErr) => {
    console.warn("[Subscription] Notification trigger error:", nErr.message);
  });

  return {
    subscriptionId: newSubscription.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  };
};

export const getCurrentSubscriptionLogic = async ({
  userId,
  userUsedStorage,
  userMaxStorage,
}) => {
  const user = await User.findById(userId).lean();
  let subscription = null;

  if (user?.subscription) {
    subscription = await Subscription.findById(user.subscription)
      .populate({
        path: "billingPlan",
        populate: { path: "tier" },
      })
      .lean();
  }

  if (!subscription) {
    subscription = await Subscription.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "billingPlan",
        populate: { path: "tier" },
      })
      .lean();
  }

  const userStorage = {
    usedStorage: userUsedStorage || 0,
    maxStorage:
      subscription?.billingPlan?.storage || userMaxStorage || 5368709120,
  };

  if (!subscription) {
    return {
      status: "NO_SUBSCRIPTION",
      isNoSubscription: true,
      planName: "No Active Subscription",
      amount: 0,
      currency: "INR",
      period: "Monthly",
      nextBillingDate: null,
      usedStorage: userStorage.usedStorage,
      maxStorage: userStorage.maxStorage,
      razorpaySubscriptionId: null,
    };
  }

  const planName =
    subscription.billingPlan?.tier?.title ||
    (subscription.billingPlan?.slug
      ? subscription.billingPlan.slug.charAt(0).toUpperCase() +
        subscription.billingPlan.slug.slice(1)
      : "Novice Vault");

  return {
    ...subscription,
    isNoSubscription: ["cancelled", "expired", "halted"].includes(
      subscription.status?.toLowerCase(),
    ),
    planName,
    amount: subscription.billingPlan?.amount ?? subscription.amount ?? 0,
    currency: subscription.billingPlan?.currency || "INR",
    period: subscription.billingPlan?.period || "Monthly",
    status: (subscription.status || "active").toUpperCase(),
    usedStorage: userStorage.usedStorage,
    maxStorage: subscription.billingPlan?.storage || userStorage.maxStorage,
    nextBillingDate: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
};

export const pauseSubscriptionLogic = async ({ subscriptionId, userId }) => {
  console.log(
    `[Subscription] Received request to pause subscription: ${subscriptionId}`,
  );

  await subscriptionPaused({ userId, subscriptionId }).catch((nErr) => {
    console.warn("[Subscription] Pause notification error:", nErr.message);
  });

  return {
    success: true,
    message: "Subscription pause action received.",
    status: "PAUSED",
    id: subscriptionId,
  };
};

export const resumeSubscriptionLogic = async ({ subscriptionId, userId }) => {
  console.log(
    `[Subscription] Received request to resume subscription: ${subscriptionId}`,
  );

  await subscriptionResumed({ userId, subscriptionId }).catch((nErr) => {
    console.warn("[Subscription] Resume notification error:", nErr.message);
  });

  return {
    success: true,
    message: "Subscription resume action received.",
    status: "ACTIVE",
    id: subscriptionId,
  };
};

export const cancelSubscriptionLogic = async ({
  subscriptionId,
  userId,
  cancelAtCycleEnd,
}) => {
  console.log(
    `[Subscription] Received request to cancel subscription: ${subscriptionId}, cancelAtCycleEnd: ${cancelAtCycleEnd}`,
  );

  await subscriptionCancelled({
    userId,
    subscriptionId,
    retentionDays: 60,
  }).catch((nErr) => {
    console.warn("[Subscription] Cancel notification error:", nErr.message);
  });

  return {
    success: true,
    message: "Subscription cancellation action received.",
    status: "CANCELLED",
    id: subscriptionId,
  };
};

export const changePlanLogic = async ({ targetPlanId, userId }) => {
  console.log(
    `[Subscription] Received request to change plan to: ${targetPlanId}`,
  );

  // =========================================================================
  // TODO: Implement Upgrade / Downgrade logic here.
  // TODO: Verify storage quota on backend (prevent downgrade if usage > quota)
  // TODO: Update subscription with Razorpay or create new subscription
  // TODO: Update user maxStorage according to target plan
  // =========================================================================

  return {
    success: true,
    message: "Plan change request received.",
    targetPlanId,
  };
};
