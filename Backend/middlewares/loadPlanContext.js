import User from "../models/userModel.js";
import Subscription from "../models/subscriptionModel.js";
import BillingPlan from "../models/billingPlanModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";

export const loadPlanContext = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id || req.user?._id).lean();
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // 1. Resolve current active or valid Subscription for this user
    let subscription = null;

    if (user.subscription) {
      subscription = await Subscription.findById(user.subscription)
        .populate({
          path: "billingPlan",
          populate: { path: "tier" },
        })
        .lean();
    }

    // If not found via direct reference or status is invalid, search for the most recent active/created subscription
    if (
      !subscription ||
      !["active", "authenticated", "created"].includes(
        subscription.status?.toLowerCase(),
      )
    ) {
      const activeSub = await Subscription.findOne({
        userId: user._id,
        status: { $in: ["active", "authenticated", "created"] },
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "billingPlan",
          populate: { path: "tier" },
        })
        .lean();

      if (activeSub) {
        subscription = activeSub;
        // Keep user.subscription in sync
        await User.updateOne(
          { _id: user._id },
          { $set: { subscription: activeSub._id } },
        );
      }
    }

    // Check if subscription has an active billingPlan
    let billingPlan = subscription?.billingPlan || null;

    // Fallback: If no subscription exists but legacy user.billingPlan exists
    if (!billingPlan && user.billingPlan) {
      billingPlan = await BillingPlan.findById(user.billingPlan)
        .populate("tier")
        .lean();
      if (billingPlan) {
        // Auto-create a subscription record to cleanly migrate
        const newSub = await Subscription.create({
          userId: user._id,
          billingPlan: billingPlan._id,
          razorpaySubscriptionId: `legacy_${user._id}_${Date.now()}`,
          status: "active",
          amount: billingPlan.amount || 0,
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

    const hasActiveSubscription = !!(
      subscription &&
      ["active", "authenticated", "created"].includes(
        subscription.status?.toLowerCase(),
      ) &&
      billingPlan &&
      billingPlan.active !== false
    );

    if (!hasActiveSubscription) {
      // User has NO active subscription
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
      const daysUntilPurge = Math.max(0, 60 - noSubscriptionDays);

      req.planContext = {
        isNoSubscription: true,
        isNoPlan: true, // backward compatibility
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
          },
          limits: {
            storageLimit: user.maxStorage || 0,
            maxConnectedDevices: 1,
            maxUploadFileSize: 0,
          },
          settings: {
            uploadSpeedMultiplier: 1,
            versionHistoryDays: 0,
            deleteFilesAfterExpiryDays: 0,
          },
        },
      };

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

    req.planContext = {
      isNoSubscription: false,
      isNoPlan: false, // backward compatibility
      canUseFreeTrial: !user.hasUsedFreeTrial,
      noSubscriptionDays: 0,
      noPlanDays: 0,
      daysUntilPurge: 60,
      subscription,
      billingPlan,
      planTier,
      features: configuration?.features || [],
      rules: configuration?.rules || {
        permissions: {
          allowUpload: true,
          allowDownload: true,
          allowSharing: true,
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

    next();
  } catch (err) {
    console.error("[loadPlanContext] Error:", err);
    next(err);
  }
};




