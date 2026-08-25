import mongoose from "mongoose";
import User from "../models/userModel.js";
import Subscription from "../models/subscriptionModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";
import Feature from "../models/featureModel.js";
import SystemConfig from "../models/systemConfigModel.js";
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

    // Free trial expiration check: if trial end date has passed, update status to expired
    const isTrialSub = Boolean(
      subscription &&
      (subscription.isFreeTrial ||
       subscription.amount === 0 ||
       subscription.billingPlan?.slug === "free-trial" ||
       subscription.billingPlan?.slug === "free-trail")
    );

    const isTrialExpired = Boolean(
      isTrialSub &&
      (
        (subscription.currentEnd && new Date(subscription.currentEnd).getTime() <= Date.now()) ||
        (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() <= Date.now()) ||
        (!subscription.currentEnd && !subscription.currentPeriodEnd && subscription.createdAt &&
          new Date(subscription.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000 <= Date.now())
      )
    );

    if (isTrialExpired && subscription && subscription.status?.toLowerCase() === "active") {
      await Subscription.updateOne(
        { _id: subscription._id },
        { $set: { status: "expired", expiredAt: new Date() } }
      );
      subscription.status = "expired";
    }

    const isSubActive = Boolean(
      subscription &&
      !isTrialExpired &&
      (["active", "authenticated", "paused"].includes(
        subscription.status?.toLowerCase(),
      ) || isCycleStillValid)
    );

    const hasActiveSubscription = Boolean(isSubActive);

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

    // Fallback: If billingPlan is missing for a free trial subscription, auto-link
    if (!billingPlan && isTrialSub) {
      billingPlan =
        (await BillingPlan.findOne({
          slug: { $in: ["free-trial", "free-trail"] },
        }).populate("tier").lean()) ||
        (await BillingPlan.findOne({ amount: 0 }).populate("tier").lean());
    }

    const slug = (billingPlan?.slug || (isTrialSub ? "free-trial" : "novice"))?.replace("trail", "trial");
    const isTrial = Boolean(isTrialSub || slug === "free-trial");

    let targetSlug = slug;
    let inheritedBillingPlan = null;
    if (isTrial) {
      const sysConfig = await SystemConfig.findOne({ key: "global" }).lean();
      targetSlug = sysConfig?.freeTrialInheritedTier || "ultimate";
      inheritedBillingPlan = await BillingPlan.findOne({
        slug: { $regex: new RegExp(`^${targetSlug}$`, "i") },
        active: true,
      }).lean();
      if (!inheritedBillingPlan) {
        inheritedBillingPlan = await BillingPlan.findOne({
          slug: { $regex: new RegExp(`^${targetSlug}$`, "i") },
        }).lean();
      }
    }

    // Resolve planTier case-insensitively (slug prioritized over title)
    let planTier = null;
    if (targetSlug) {
      planTier =
        (await PlanTier.findOne({ slug: targetSlug }).lean()) ||
        (await PlanTier.findOne({ slug: { $regex: new RegExp(`^${targetSlug}$`, "i") } }).lean()) ||
        (await PlanTier.findOne({
          $or: [
            { title: { $regex: new RegExp(`^${targetSlug}$`, "i") } },
            { type: { $regex: new RegExp(`^${targetSlug}$`, "i") } },
          ],
        }).lean());
    }

    if (!planTier && billingPlan?.tier) {
      planTier =
        typeof billingPlan.tier === "object"
          ? billingPlan.tier
          : await PlanTier.findById(billingPlan.tier).lean();
    }

    if (!planTier && slug) {
      planTier = await PlanTier.findOne({
        $or: [
          { slug: { $regex: new RegExp(`^${slug}$`, "i") } },
          { title: { $regex: new RegExp(`^${slug}$`, "i") } },
        ],
      }).lean();
    }

    if (!planTier) {
      planTier =
        (await PlanTier.findOne({ slug: "ultimate" }).lean()) ||
        (await PlanTier.findOne({ slug: "free-trial" }).lean()) ||
        (await PlanTier.findOne({ active: true }).lean()) ||
        (await PlanTier.findOne().lean());
    }

    // Resolve plan configuration
    let configuration = null;
    if (planTier) {
      configuration = await PlanTierConfiguration.findOne({
        $or: [
          { tier: planTier._id },
          { slug: planTier.slug },
          { slug: { $regex: new RegExp(`^${planTier.slug}$`, "i") } },
          { slug: { $regex: new RegExp(`^${targetSlug}$`, "i") } },
        ],
      })
        .populate("features")
        .lean();
    }

    if (!configuration && targetSlug) {
      configuration = await PlanTierConfiguration.findOne({
        slug: { $regex: new RegExp(`^${targetSlug}$`, "i") },
      })
        .populate("features")
        .lean();
    }

    if (!configuration) {
      configuration = await PlanTierConfiguration.findOne().populate("features").lean();
    }

    // Ensure all features are loaded properly
    let rawFeatures = configuration?.features || [];
    if (rawFeatures.length > 0 && (typeof rawFeatures[0] === "string" || (rawFeatures[0] && !rawFeatures[0].key && rawFeatures[0]._id))) {
      const featureIds = rawFeatures.map(f => (typeof f === "object" && f._id) ? f._id : f);
      const fetchedFeatures = await Feature.find({
        $or: [
          { _id: { $in: featureIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
          { key: { $in: featureIds } },
        ],
      }).lean();
      if (fetchedFeatures.length > 0) {
        rawFeatures = fetchedFeatures;
      }
    }

    // Dynamic storage calculation:
    // - Free Trial takes its storage limit from the configured free-trial BillingPlan (e.g. 5 GB)
    // - Paid/Regular plans take storage from their active BillingPlan
    let effectiveStorage = billingPlan?.storage || 5368709120;
    if (isTrial) {
      let freeTrialPlanDoc = null;
      if (billingPlan?._id) {
        freeTrialPlanDoc = await BillingPlan.findById(billingPlan._id).lean();
      }
      if (!freeTrialPlanDoc) {
        freeTrialPlanDoc =
          (await BillingPlan.findOne({
            slug: { $in: ["free-trial", "free-trail"] },
            active: true,
          }).lean()) ||
          (await BillingPlan.findOne({
            slug: { $in: ["free-trial", "free-trail"] },
          }).lean()) ||
          billingPlan;
      }
      effectiveStorage = freeTrialPlanDoc?.storage || billingPlan?.storage || 5368709120;
    } else {
      let freshBillingPlan = null;
      if (billingPlan?._id) {
        freshBillingPlan = await BillingPlan.findById(billingPlan._id).lean();
      }
      effectiveStorage =
        freshBillingPlan?.storage ||
        billingPlan?.storage ||
        configuration?.rules?.limits?.storageLimit ||
        user.maxStorage ||
        5368709120;
    }

    // Filter out features that have been disabled globally by the owner
    const activeFeatures = (rawFeatures || []).filter(
      (f) => f && typeof f === "object" && f.enabled !== false,
    );

    const isPaused = subscription?.status?.toLowerCase() === "paused";

    const defaultPermissions = {
      allowUpload: true,
      allowDownload: true,
      allowSharing: true,
      allowEdit: true,
      allowMove: true,
      allowCopy: true,
      allowDelete: true,
    };

    const configPermissions = configuration?.rules?.permissions || {};

    const effectivePermissions = isPaused
      ? {
          allowUpload: false,
          allowDownload: true,
          allowSharing: false,
          allowEdit: false,
          allowMove: false,
          allowCopy: false,
          allowDelete: false,
        }
      : {
          allowUpload: configPermissions.allowUpload ?? defaultPermissions.allowUpload,
          allowDownload: configPermissions.allowDownload ?? defaultPermissions.allowDownload,
          allowSharing: configPermissions.allowSharing ?? defaultPermissions.allowSharing,
          allowEdit: configPermissions.allowEdit ?? defaultPermissions.allowEdit,
          allowMove: configPermissions.allowMove ?? defaultPermissions.allowMove,
          allowCopy: configPermissions.allowCopy ?? defaultPermissions.allowCopy,
          allowDelete: configPermissions.allowDelete ?? defaultPermissions.allowDelete,
        };

    const defaultLimits = {
      storageLimit: effectiveStorage,
      maxConnectedDevices: 5,
      maxUploadFileSize: 5368709120,
    };

    const defaultSettings = {
      uploadSpeedMultiplier: 1,
      versionHistoryDays: 30,
      deleteFilesAfterExpiryDays: 30,
    };

    const effectiveRules = {
      permissions: effectivePermissions,
      limits: {
        ...defaultLimits,
        ...(configuration?.rules?.limits || {}),
        storageLimit: effectiveStorage,
      },
      settings: {
        ...defaultSettings,
        ...(configuration?.rules?.settings || {}),
      },
    };

    const effectiveBillingPlan = isTrial
      ? {
          ...(billingPlan || {}),
          storage: effectiveStorage,
          inheritedSlug: targetSlug,
          inheritedTitle: planTier?.title || targetSlug,
        }
      : billingPlan;

    req.planContext = {
      isNoSubscription: false,
      isNoPlan: false, // backward compatibility
      isPaused: subscription?.status?.toLowerCase() === "paused",
      isReadOnly: false,
      isFreeTrial: isTrial,
      canUseFreeTrial: !user.hasUsedFreeTrial,
      noSubscriptionDays: 0,
      noPlanDays: 0,
      daysUntilPurge: 30,
      subscription,
      billingPlan: effectiveBillingPlan,
      planTier,
      storageLimit: effectiveStorage,
      maxStorage: effectiveStorage,
      features: activeFeatures,
      rules: effectiveRules,
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

