import { rzInstance } from "../integrations/razorpay/razorpay.client.js";
import Subscription from "../models/subscriptionModel.js";

export const createSubscriptionLogic = async ({ planId, userId }) => {
  const newSubscription = await rzInstance.subscriptions.create({
    plan_id: planId,
    total_count: 120,
    notes: {
      userId: userId,
    },
  });

  if (!newSubscription) {
    throw Object.assign(new Error("Subscription not created"), { status: 404 });
  }

  const subscription = await Subscription.create({
    razorpaySubscriptionId: newSubscription.id,
    userId: userId,
  });

  console.log("[Subscription] Created:", subscription.razorpaySubscriptionId);

  return {
    subscriptionId: newSubscription.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  };
};

export const getCurrentSubscriptionLogic = async ({ userId, userUsedStorage, userMaxStorage }) => {
  const subscription = await Subscription.findOne({ userId })
    .sort({ createdAt: -1 })
    .lean();

  const userStorage = {
    usedStorage: userUsedStorage || 0,
    maxStorage: userMaxStorage || 10737418240, // Default 10GB or 1TB
  };

  if (!subscription) {
    return {
      status: "ACTIVE",
      planName: "Novice Vault",
      amount: 0,
      currency: "INR",
      period: "Monthly",
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usedStorage: userStorage.usedStorage,
      maxStorage: userStorage.maxStorage,
      razorpaySubscriptionId: null,
    };
  }

  return {
    ...subscription,
    status: (subscription.status || "ACTIVE").toUpperCase(),
    usedStorage: userStorage.usedStorage,
    maxStorage: userStorage.maxStorage,
  };
};

export const pauseSubscriptionLogic = async ({ subscriptionId, userId }) => {
  console.log(`[Subscription] Received request to pause subscription: ${subscriptionId}`);

  // =========================================================================
  // TODO: Implement Razorpay pause logic here.
  // TODO: Call rzInstance.subscriptions.pause(id, { pause_at: 'now' })
  // TODO: Update subscription status in MongoDB to 'PAUSED'
  // =========================================================================

  return {
    success: true,
    message: "Subscription pause action received.",
    status: "PAUSED",
    id: subscriptionId,
  };
};

export const resumeSubscriptionLogic = async ({ subscriptionId, userId }) => {
  console.log(`[Subscription] Received request to resume subscription: ${subscriptionId}`);

  // =========================================================================
  // TODO: Implement Razorpay resume logic here.
  // TODO: Call rzInstance.subscriptions.resume(id, { resume_at: 'now' })
  // TODO: Update subscription status in MongoDB to 'ACTIVE'
  // =========================================================================

  return {
    success: true,
    message: "Subscription resume action received.",
    status: "ACTIVE",
    id: subscriptionId,
  };
};

export const cancelSubscriptionLogic = async ({ subscriptionId, userId, cancelAtCycleEnd }) => {
  console.log(
    `[Subscription] Received request to cancel subscription: ${subscriptionId}, cancelAtCycleEnd: ${cancelAtCycleEnd}`,
  );

  // =========================================================================
  // TODO: Implement Razorpay cancel logic here.
  // TODO: Call rzInstance.subscriptions.cancel(id, cancelAtCycleEnd)
  // TODO: Update subscription status in MongoDB to 'CANCELLED'
  // TODO: Apply grace period and handling logic
  // =========================================================================

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
