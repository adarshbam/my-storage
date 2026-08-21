import mongoose from "mongoose";
import { rzInstance } from "../integrations/razorpay/razorpay.client.js";
import Subscription from "../models/subscriptionModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import {
  subscriptionActivated,
  subscriptionCancelled,
  subscriptionPaused,
  subscriptionResumed,
} from "./notification.service.js";
import { invalidatePlanContextCache } from "../middlewares/loadPlanContext.js";

const findUserSubscription = async (subscriptionId, userId) => {
  let sub = null;
  if (subscriptionId && mongoose.Types.ObjectId.isValid(subscriptionId)) {
    sub = await Subscription.findOne({ _id: subscriptionId, userId });
  }
  if (!sub && subscriptionId && subscriptionId !== "sub_current") {
    sub = await Subscription.findOne({
      razorpaySubscriptionId: subscriptionId,
      userId,
    });
  }
  if (!sub) {
    // 1. Search for an active or paused subscription
    sub = await Subscription.findOne({
      userId,
      status: { $in: ["active", "paused", "authenticated"] },
    }).sort({ updatedAt: -1, createdAt: -1 });
  }
  if (!sub) {
    // 2. Search for a cancelled subscription with a valid remaining cycle
    const candidate = await Subscription.findOne({
      userId,
      status: "cancelled",
    }).sort({ createdAt: -1 });

    if (candidate) {
      const isCycleValid = Boolean(
        candidate.cancelAtCycleEnd &&
          ((candidate.currentEnd &&
            new Date(candidate.currentEnd).getTime() > Date.now()) ||
            (!candidate.currentEnd &&
              new Date(candidate.createdAt).getTime() +
                30 * 24 * 60 * 60 * 1000 >
                Date.now())),
      );
      if (isCycleValid) {
        sub = candidate;
      }
    }
  }
  if (!sub) {
    const user = await User.findById(userId);
    if (user?.subscription) {
      sub = await Subscription.findOne({ _id: user.subscription, userId });
    }
  }
  if (!sub) {
    sub = await Subscription.findOne({ userId }).sort({ createdAt: -1 });
  }
  return sub;
};

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
    currency: billingPlan.currency || "INR",
    status: "created",
    totalCount: newSubscription.total_count || 120,
  });

  console.log(
    "[Subscription] Created checkout session for user:",
    subscription.razorpaySubscriptionId,
  );

  return {
    subscriptionId: newSubscription.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  };
};

export const confirmSubscriptionPaymentLogic = async ({
  razorpaySubscriptionId,
  razorpayPaymentId,
  userId,
}) => {
  if (!razorpaySubscriptionId) {
    throw Object.assign(new Error("Missing subscription ID"), { status: 400 });
  }

  const subscription = await Subscription.findOne({
    razorpaySubscriptionId,
    userId,
  }).populate("billingPlan");

  if (!subscription) {
    throw Object.assign(new Error("Subscription not found"), { status: 404 });
  }

  // Fetch live state from Razorpay
  let rzSub = null;
  try {
    rzSub = await rzInstance.subscriptions.fetch(razorpaySubscriptionId);
  } catch (err) {
    console.warn("[confirmSubscriptionPaymentLogic] Razorpay fetch note:", err.message);
  }

  const now = new Date();
  subscription.status = "active";
  subscription.activatedAt = now;
  subscription.purchasedAt = subscription.purchasedAt || now;
  subscription.paidCount = rzSub?.paid_count || 1;
  subscription.remainingCount = rzSub?.remaining_count;
  subscription.totalCount = rzSub?.total_count || subscription.totalCount;

  if (rzSub?.current_start) {
    subscription.currentStart = new Date(rzSub.current_start * 1000);
  } else {
    subscription.currentStart = now;
  }

  if (rzSub?.current_end) {
    subscription.currentEnd = new Date(rzSub.current_end * 1000);
  } else {
    subscription.currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  if (rzSub?.charge_at) {
    subscription.chargeAt = new Date(rzSub.charge_at * 1000);
  }

  await subscription.save();

  // Cancel prior active subscriptions for this user to avoid duplicate recurring debits
  const previousActiveSubscriptions = await Subscription.find({
    userId,
    status: { $in: ["active", "paused"] },
    _id: { $ne: subscription._id },
  });

  for (const prevSub of previousActiveSubscriptions) {
    try {
      await rzInstance.subscriptions.cancel(prevSub.razorpaySubscriptionId, false);
    } catch (cancelErr) {
      console.warn(
        `[confirmPayment] Could not cancel prior sub ${prevSub.razorpaySubscriptionId}:`,
        cancelErr.message,
      );
    }
    prevSub.status = "cancelled";
    prevSub.cancellationReason = "system";
    await prevSub.save();
  }

  // Update user storage limits and clear grace markers
  const updateUserData = {
    subscription: subscription._id,
    billingPlan: subscription.billingPlan?._id,
    noSubscriptionSince: null,
    noPlanSince: null,
  };
  if (subscription.billingPlan?.storage) {
    updateUserData.maxStorage = subscription.billingPlan.storage;
  }

  await User.findByIdAndUpdate(userId, { $set: updateUserData });
  await invalidatePlanContextCache(userId);

  // Trigger activation notification
  await subscriptionActivated({
    userId,
    subscriptionId: subscription._id,
    planName: subscription.billingPlan?.slug
      ? subscription.billingPlan.slug.toUpperCase()
      : "Vault Storage Plan",
  }).catch((nErr) => {
    console.warn("[confirmPayment] Notification trigger error:", nErr.message);
  });

  return {
    success: true,
    status: "ACTIVE",
    subscription,
  };
};

export const getCurrentSubscriptionLogic = async ({
  userId,
  userUsedStorage,
  userMaxStorage,
}) => {
  const user = await User.findById(userId).lean();
  let subscription = null;

  // 1. Search for active or paused subscription first
  subscription = await Subscription.findOne({
    userId,
    status: { $in: ["active", "paused", "authenticated"] },
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate({
      path: "billingPlan",
      populate: { path: "tier" },
    })
    .lean();

  // 2. Check for cycle-valid cancelled subscription
  if (!subscription) {
    const candidate = await Subscription.findOne({
      userId,
      status: "cancelled",
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "billingPlan",
        populate: { path: "tier" },
      })
      .lean();

    if (candidate) {
      const isCycleValid = Boolean(
        candidate.cancelAtCycleEnd &&
          ((candidate.currentEnd &&
            new Date(candidate.currentEnd).getTime() > Date.now()) ||
            (!candidate.currentEnd &&
              new Date(candidate.createdAt).getTime() +
                30 * 24 * 60 * 60 * 1000 >
                Date.now())),
      );
      if (isCycleValid) {
        subscription = candidate;
      }
    }
  }

  // 3. Fallback to linked user.subscription or most recent
  if (!subscription && user?.subscription) {
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

  let usedStorage = userUsedStorage;
  if (usedStorage === undefined && user?.rootDirId) {
    const rootDir = await Directory.findOne({ _id: user.rootDirId })
      .select("size")
      .lean();
    if (rootDir?.size) {
      usedStorage = rootDir.size;
    }
  }

  const userStorage = {
    usedStorage: usedStorage || 0,
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

  const isCycleStillValid = Boolean(
    subscription.status?.toLowerCase() === "cancelled" &&
      subscription.cancelAtCycleEnd &&
      ((subscription.currentEnd &&
        new Date(subscription.currentEnd).getTime() > Date.now()) ||
        (!subscription.currentEnd &&
          new Date(subscription.createdAt).getTime() +
            30 * 24 * 60 * 60 * 1000 >
            Date.now())),
  );

  const isActuallyActive = Boolean(
    ["active", "authenticated"].includes(subscription.status?.toLowerCase()) ||
      isCycleStillValid,
  );

  let nextBillingDate = null;
  if (isActuallyActive) {
    if (subscription.currentEnd) {
      nextBillingDate = new Date(subscription.currentEnd).toISOString();
    } else if (subscription.createdAt) {
      nextBillingDate = new Date(
        new Date(subscription.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }
  }

  return {
    ...subscription,
    isNoSubscription: !isActuallyActive,
    isCycleValid: isCycleStillValid,
    planName,
    amount: subscription.billingPlan?.amount ?? subscription.amount ?? 0,
    currency: subscription.billingPlan?.currency || "INR",
    period: subscription.billingPlan?.period || "Monthly",
    status: (subscription.status || "active").toUpperCase(),
    usedStorage: userStorage.usedStorage,
    maxStorage: subscription.billingPlan?.storage || userStorage.maxStorage,
    nextBillingDate,
  };
};

export const pauseSubscriptionLogic = async ({ subscriptionId, userId }) => {
  const sub = await findUserSubscription(subscriptionId, userId);
  if (!sub)
    throw Object.assign(new Error("Subscription not found"), {
      status: 404,
    });

  // 1. Tell Razorpay to pause
  await rzInstance.subscriptions.pause(sub.razorpaySubscriptionId, {
    pause_at: "now",
  });

  sub.status = "paused";
  sub.pausedAt = new Date();
  await sub.save();

  await invalidatePlanContextCache(userId);

  return { success: true, status: "PAUSED", subscriptionId: sub._id };
};

export const resumeSubscriptionLogic = async ({ subscriptionId, userId }) => {
  const sub = await findUserSubscription(subscriptionId, userId);
  if (!sub)
    throw Object.assign(new Error("Subscription not found"), {
      status: 404,
    });

  // 1. Tell Razorpay to resume
  await rzInstance.subscriptions.resume(sub.razorpaySubscriptionId, {
    resume_at: "now",
  });

  sub.status = "active";
  sub.resumedAt = new Date();
  sub.pausedAt = null;
  await sub.save();

  await invalidatePlanContextCache(userId);

  return { success: true, status: "RESUMED", subscriptionId: sub._id };
};

export const cancelSubscriptionLogic = async ({
  subscriptionId,
  userId,
  cancelAtCycleEnd = true,
}) => {
  const sub = await findUserSubscription(subscriptionId, userId);
  if (!sub)
    throw Object.assign(new Error("Subscription not found"), { status: 404 });

  // 1. Cancel on Razorpay (default to cancel_at_cycle_end: 1)
  const cancelAtEndNum = cancelAtCycleEnd ? 1 : 0;
  await rzInstance.subscriptions.cancel(
    sub.razorpaySubscriptionId,
    cancelAtEndNum,
  );

  // 2. Record lifecycle metadata
  const now = new Date();
  sub.status = "cancelled";
  sub.cancelledAt = now;
  sub.cancelledBy = "user";
  sub.cancellationReason = "user_requested";
  sub.cancelAtCycleEnd = Boolean(cancelAtCycleEnd);

  if (!sub.currentEnd) {
    sub.currentEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  // If immediate cancellation (not cycle end), mark grace period start now
  if (!cancelAtCycleEnd) {
    await User.findByIdAndUpdate(userId, {
      $set: { noSubscriptionSince: now, noPlanSince: now },
    });
  }

  await sub.save();
  await invalidatePlanContextCache(userId);

  return {
    success: true,
    status: "CANCELLED",
    cancelAtCycleEnd: sub.cancelAtCycleEnd,
    currentEnd: sub.currentEnd,
  };
};
