import User from "../models/userModel.js";
import Subscription from "../models/subscriptionModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";
import { cacheGet, cacheSet, cacheDel, invalidateUserSessions } from "../databases/redis.js";

export const invalidatePlanContextCache = async (userId) => {
  if (!userId) return;
  try {
    await cacheDel(`plan_context:${userId}`);
    await invalidateUserSessions(userId);
  } catch (err) {
    console.error(
      `[invalidatePlanContextCache] Error for ${userId}:`,
      err.message,
    );
  }
};

export const loadPlanContext = async (req, res, next) => {
  try {
    const userId = (req.user?.id || req.user?._id)?.toString();
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // 0. Redis Cache Fast-Path (<1ms lookup)
    const cachedPlanContext = await cacheGet(`plan_context:${userId}`);
    if (cachedPlanContext) {
      try {
        req.planContext = JSON.parse(cachedPlanContext);
        return next();
      } catch (parseErr) {
        console.error("[loadPlanContext] Cache parse error:", parseErr);
      }
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // 1. Resolve current active or valid Subscription for this user
    let subscription = null;

    // Search for active or paused subscription first
    subscription = await Subscription.findOne({
      userId: user._id,
      status: { $in: ["active", "paused", "authenticated"] },
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate({
        path: "billingPlan",
        populate: { path: "tier" },
      })
      .lean();

    // If none, search for cancelled subscription with valid cycle remaining
    if (!subscription) {
      const candidate = await Subscription.findOne({
        userId: user._id,
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

    // Fallback to linked user.subscription if active
    if (!subscription && user.subscription) {
      subscription = await Subscription.findById(user.subscription)
        .populate({
          path: "billingPlan",
          populate: { path: "tier" },
        })
        .lean();
    }

    // Check if subscription has an active billingPlan
    let billingPlan = subscription?.billingPlan || null;

    // Fallback: If no subscription exists but legacy user.billingPlan exists
    if (!billingPlan && user.billingPlan) {
      billingPlan = await BillingPlan.findById(user.billingPlan)
        .populate("tier")
        .lean();
      if (billingPlan) {
        const newSub = await Subscription.create({
          userId: user._id,
          billingPlan: billingPlan._id,
          razorpaySubscriptionId: `legacy_${user._id}_${Date.now()}`,
          amount: billingPlan.amount || 0,
          status: "active",
        });
        subscription = await Subscription.findById(newSub._id)
          .populate({
            path: "billingPlan",
            populate: { path: "tier" },
          })
          .lean();
        await User.updateOne(
          { _id: user._id },
          { $set: { subscription: newSub._id } },
        );
      }
    }

    // Check if subscription is active, or cancelled at cycle-end with valid cycle remaining
    const isCycleStillValid = Boolean(
      subscription &&
        subscription.status?.toLowerCase() === "cancelled" &&
        subscription.cancelAtCycleEnd &&
        ((subscription.currentEnd &&
          new Date(subscription.currentEnd).getTime() > Date.now()) ||
          (!subscription.currentEnd &&
            new Date(subscription.createdAt).getTime() +
              30 * 24 * 60 * 60 * 1000 >
              Date.now())),
    );

    const hasActiveSubscription = !!(
      subscription &&
      (["active", "authenticated"].includes(
        subscription.status?.toLowerCase(),
      ) || isCycleStillValid) &&
      billingPlan &&
      billingPlan.active !== false
    );

    if (!hasActiveSubscription) {
      // User has NO active subscription (30-day Read-Only Vault Lockdown)
      let noSubscriptionSince = user.noSubscriptionSince || user.noPlanSince;
      if (!noSubscriptionSince) {
        noSubscriptionSince = new Date();
        await User.updateOne(
          { _id: user._id },
          { $set: { noSubscriptionSince, noPlanSince: noSubscriptionSince } },
        );
      }

      const noSubscriptionDays = Math.floor(
        (Date.now() - new Date(noSubscriptionSince).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const daysUntilPurge = Math.max(0, 30 - noSubscriptionDays);

      req.planContext = {
        isNoSubscription: true,
        isNoPlan: true, // backward compatibility
        isReadOnly: true,
        isFreeTrial: false,
        canUseFreeTrial: !user.hasUsedFreeTrial,
        noSubscriptionSince,
        noPlanSince: noSubscriptionSince,
        noSubscriptionDays,
        noPlanDays: noSubscriptionDays,
        daysUntilPurge,
        subscription: null,
        billingPlan: null,
        planTier: null,
        features: [],
        rules: {
          permissions: {
            allowUpload: false,
            allowDownload: true,
            allowSharing: false,
            allowEdit: false,
            allowMove: false,
            allowCopy: false,
            allowDelete: false,
          },
          limits: {
            storageLimit: user.maxStorage || 0,
            maxConnectedDevices: 1,
            maxUploadFileSize: 0,
          },
          settings: {
            uploadSpeedMultiplier: 1,
            versionHistoryDays: 0,
            deleteFilesAfterExpiryDays: 30,
          },
        },
      };

      await cacheSet(
        `plan_context:${userId}`,
        JSON.stringify(req.planContext),
        300,
      );
      return next();
    }

    // User HAS an active subscription -> ensure noSubscriptionSince and noPlanSince are cleared
    if (user.noSubscriptionSince || user.noPlanSince) {
      await User.updateOne(
        { _id: user._id },
        { $set: { noSubscriptionSince: null, noPlanSince: null } },
      );
    }

    const slug = billingPlan.slug?.replace("trail", "trial");

    const planTier =
      (billingPlan.tier &&
        (typeof billingPlan.tier === "object"
          ? billingPlan.tier
          : await PlanTier.findById(billingPlan.tier).lean())) ||
      (slug && (await PlanTier.findOne({ slug }).lean())) ||
      (await PlanTier.findOne({ slug: "free-trial" }).lean()) ||
      (await PlanTier.findOne({ active: true }).lean());

    const configuration =
      (planTier &&
        (await PlanTierConfiguration.findOne({
          $or: [{ tier: planTier._id }, { slug: planTier.slug }],
        })
          .populate("features")
          .lean())) ||
      (await PlanTierConfiguration.findOne().populate("features").lean());

    // Filter out features that have been disabled globally by the owner
    const activeFeatures = (configuration?.features || []).filter(
      (f) => f && f.enabled !== false,
    );

    const isTrial = Boolean(subscription?.isFreeTrial || slug === "free-trial");

    req.planContext = {
      isNoSubscription: false,
      isNoPlan: false, // backward compatibility
      isReadOnly: false,
      isFreeTrial: isTrial,
      canUseFreeTrial: !user.hasUsedFreeTrial,
      noSubscriptionDays: 0,
      noPlanDays: 0,
      daysUntilPurge: 30,
      subscription,
      billingPlan,
      planTier,
      features: activeFeatures,
      rules: configuration?.rules || {
        permissions: {
          allowUpload: true,
          allowDownload: true,
          allowSharing: true,
          allowEdit: true,
          allowMove: true,
          allowCopy: true,
          allowDelete: true,
        },
        limits: {
          storageLimit: billingPlan.storage || user.maxStorage || 5368709120,
          maxConnectedDevices: 5,
          maxUploadFileSize: 104857600,
        },
        settings: {
          uploadSpeedMultiplier: 1,
          versionHistoryDays: 30,
          deleteFilesAfterExpiryDays: 30,
        },
      },
    };

    await cacheSet(
      `plan_context:${userId}`,
      JSON.stringify(req.planContext),
      300,
    );
    next();
  } catch (err) {
    console.error("[loadPlanContext] Error:", err);
    next(err);
  }
};
