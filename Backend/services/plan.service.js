import { rzInstance } from "../integrations/razorpay/razorpay.client.js";
import BillingPlan from "../models/billingPlanModel.js";
import Feature from "../models/featureModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";
import SystemConfig from "../models/systemConfigModel.js";
import User from "../models/userModel.js";
import Subscription from "../models/subscriptionModel.js";
import TrialClaim from "../models/trialClaimModel.js";
import { hashPhoneNumber } from "../utils/crypto.utils.js";
import {
  invalidateUserSessions,
  invalidateGlobalPlanCache,
  invalidateAllPlanContexts,
} from "../databases/redis.js";
import { subscriptionActivated } from "./notification.service.js";
import { withTransaction } from "../utils/transaction.js";
import { AppError } from "../errors/AppError.js";

export const createPlanLogic = async ({ planData, userId, userRole }) => {
  const { slug, amount, storage, period, currency } = planData;

  console.log(planData);

  if (userRole != "Owner") {
    throw Object.assign(new Error("You are forbidden to perform this action"), {
      status: 403,
    });
  }

  const planCurrency = (currency || "INR").toUpperCase();
  const existingPlan = await BillingPlan.findOne({
    slug,
    amount,
    period,
  });
  console.log(existingPlan);

  if (existingPlan) {
    return {
      planId: existingPlan.razorpayPlanId,
    };
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
      name: `${slug} - ${period}`,
      amount: rzAmount,
      currency: "INR",
    },
  });

  console.log(newPlan);
  console.log(slug, period);

  let plan = null;
  await withTransaction(async (session) => {
    await BillingPlan.updateMany(
      {
        slug,
        period,
      },
      {
        active: false,
      },
      { session },
    );

    const [createdPlan] = await BillingPlan.create(
      [
        {
          razorpayPlanId: newPlan.id,
          slug,
          amount,
          currency: planCurrency,
          period,
          storage,
        },
      ],
      { session },
    );
    plan = createdPlan;
  });

  console.log("[Plan] Created:", plan.razorpayPlanId);

  return {
    plan: plan.razorpayPlanId,
  };
};

export const planTierManagementLogic = async ({
  planData,
  userId,
  userRole,
}) => {
  const { type, amount, storage, period, currency } = planData;

  console.log(planData);

  if (userRole != "Owner") {
    throw Object.assign(new Error("You are forbidden to perform this action"), {
      status: 403,
    });
  }

  const planCurrency = (currency || "INR").toUpperCase();
  const existingPlan = await BillingPlan.findOne({
    type,
    amount,
    period,
  });
  console.log(existingPlan);

  if (existingPlan) {
    const disablingPlans = await BillingPlan.updateMany(
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

    return {
      planId: existingPlan.razorpayPlanId,
    };
  }

  return {
    plan: plan.razorpayPlanId,
  };
};

export const getAllActivePlansLogic = async () => {
  const existingActivePlans = await BillingPlan.find({ active: true })
    .populate("tier")
    .lean();

  const planTierConfigurations = await PlanTierConfiguration.find()
    .populate("features")
    .lean();

  const tierFeatureConfigs = {};
  const tierRuleConfigs = {};

  planTierConfigurations.forEach((config) => {
    const slugKey = config.slug || config.tier?.slug;
    if (slugKey) {
      tierFeatureConfigs[slugKey] = (config.features || []).map((f) =>
        typeof f === "object" ? f.title || f.description || f.key : f,
      );
      tierRuleConfigs[slugKey] = config.rules || {};
    }
  });

  const enrichedPlans = existingActivePlans.map((plan) => {
    const slugKey = plan.slug;
    return {
      ...plan,
      type:
        plan.tier?.title ||
        (plan.slug
          ? plan.slug.charAt(0).toUpperCase() + plan.slug.slice(1)
          : "Plan"),
      features: tierFeatureConfigs[slugKey] || [],
      rules: tierRuleConfigs[slugKey] || {},
    };
  });

  return enrichedPlans;
};

export const getOwnerSettingsLogic = async ({ userRole }) => {
  if (userRole !== "Owner") {
    throw AppError.forbidden("Access denied. Only Owners can view settings.");
  }

  // 1. Delete any legacy/invalid Yearly Free Trial plans from database
  await BillingPlan.deleteMany({
    slug: { $in: ["free-trial", "free-trail"] },
    period: "Yearly",
  });

  const systemConfig = await SystemConfig.findOne({ key: "global" }).lean();
  const features = await Feature.find().lean();
  const allFeatureIds = features.map((f) => f._id);
  const planTiers = await PlanTier.find().lean();

  // 2. Auto-heal any tiers that might be missing billing plans or configurations
  for (const tier of planTiers) {
    const slug = tier.slug;
    const isTrial = ["free-trial", "free-trail"].includes(slug);

    // Ensure Monthly plan exists
    const monthlyPlan = await BillingPlan.findOne({ slug, period: "Monthly" });
    if (!monthlyPlan) {
      await BillingPlan.create({
        tier: tier._id,
        slug,
        period: "Monthly",
        amount: isTrial ? 0 : 199,
        currency: "INR",
        storage: 5 * 1024 ** 3,
        razorpayPlanId: isTrial ? "plan_free_monthly" : `plan_${slug}_monthly_auto`,
        active: true,
      });
    }

    // Ensure Yearly plan exists for non-trial plans
    if (!isTrial) {
      const yearlyPlan = await BillingPlan.findOne({ slug, period: "Yearly" });
      if (!yearlyPlan) {
        await BillingPlan.create({
          tier: tier._id,
          slug,
          period: "Yearly",
          amount: 1999,
          currency: "INR",
          storage: 5 * 1024 ** 3,
          razorpayPlanId: `plan_${slug}_yearly_auto`,
          active: true,
        });
      }
    }

    // Ensure PlanTierConfiguration exists
    const config = await PlanTierConfiguration.findOne({
      $or: [{ tier: tier._id }, { slug }],
    });
    if (!config) {
      await PlanTierConfiguration.create({
        tier: tier._id,
        slug,
        features: allFeatureIds,
        rules: {
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
            storageLimit: 5 * 1024 * 1024 * 1024,
            maxConnectedDevices: 5,
            maxUploadFileSize: 5 * 1024 * 1024 * 1024,
          },
          settings: {
            uploadSpeedMultiplier: 5,
            versionHistoryDays: 30,
            deleteFilesAfterExpiryDays: 0,
          },
        },
      });
    }
  }

  const planTierConfigurations = await PlanTierConfiguration.find()
    .populate("tier")
    .populate("features")
    .lean();

  const billingPlans = await BillingPlan.find({
    $nor: [
      {
        slug: { $in: ["free-trial", "free-trail"] },
        period: "Yearly",
      },
    ],
  }).lean();

  const tierFeatureConfigs = {};
  const tierRuleConfigs = {};

  planTierConfigurations.forEach((config) => {
    const slugKey = config.slug || config.tier?.slug;
    if (slugKey) {
      const featureKeys = (config.features || []).map((f) =>
        typeof f === "object" ? f.key : f,
      );
      tierFeatureConfigs[slugKey] = featureKeys;
      tierRuleConfigs[slugKey] = config.rules || {};

      if (slugKey.toLowerCase() !== slugKey) {
        tierFeatureConfigs[slugKey.toLowerCase()] = featureKeys;
        tierRuleConfigs[slugKey.toLowerCase()] = config.rules || {};
      }
    }
  });

  return {
    limits: systemConfig,
    planTiers,
    billingPlans,
    features,
    tierFeatureConfigs,
    tierRuleConfigs,
    tiersConfigs: planTierConfigurations,
  };
};

export const updateGlobalLimitsLogic = async ({ limits, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(
      new Error("Access denied. Only Owners can update settings."),
      { status: 403 },
    );
  }

  const {
    maxDevicesLimit,
    maxFileSizeLimit,
    defaultStorageUnit,
    maxFileSizeUnit,
    maxFileSizeValue,
    sessionTimeoutUnit,
    sessionTimeoutValue,
    freeTrialInheritedTier,
  } = limits;

  const updateDoc = {
    maxDevicesLimit,
    maxFileSizeLimit,
    defaultStorageUnit,
    maxFileSizeUnit,
    maxFileSizeValue,
    sessionTimeoutUnit,
    sessionTimeoutValue,
  };

  if (freeTrialInheritedTier !== undefined) {
    updateDoc.freeTrialInheritedTier = freeTrialInheritedTier;

    // Look up the storage for the free-trial billing plan
    const freeTrialPlanDoc =
      (await BillingPlan.findOne({
        slug: { $in: ["free-trial", "free-trail"] },
        active: true,
      }).lean()) ||
      (await BillingPlan.findOne({
        amount: 0,
        active: true,
      }).lean());

    const grantedStorage = freeTrialPlanDoc?.storage || 5368709120;

    // Find all active/valid free trial subscriptions and update user maxStorage in MongoDB
    const freeTrialSubs = await Subscription.find({
      $or: [{ isFreeTrial: true }, { amount: 0 }],
      status: { $in: ["active", "paused", "authenticated"] },
    })
      .select("_id userId")
      .lean();

    if (freeTrialSubs.length > 0) {
      const freeTrialSubIds = freeTrialSubs.map((s) => s._id);
      const freeTrialUserIds = freeTrialSubs
        .map((s) => s.userId)
        .filter(Boolean);
      await User.updateMany(
        {
          $or: [
            { subscription: { $in: freeTrialSubIds } },
            { _id: { $in: freeTrialUserIds } },
          ],
        },
        { $set: { maxStorage: grantedStorage } },
      );
    }
  }

  const globalLimits = await SystemConfig.findOneAndUpdate(
    { key: "global" },
    { $set: updateDoc },
    { returnDocument: "after", upsert: true },
  );

  await invalidateGlobalPlanCache();

  return globalLimits;
};

export const updatePlansLogic = async ({ plans, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(
      new Error("Access denied. Only Owners can update plans."),
      { status: 403 },
    );
  }

  const sysConfig = await SystemConfig.findOne({ key: "global" }).lean();
  const currentFreeTrialInheritedTier =
    sysConfig?.freeTrialInheritedTier || "ultimate";

  const updatedPlans = await Promise.all(
    plans.map(async (p) => {
      const numAmount = Number(p.amount);
      const numStorage = Number(p.storage);
      const planCurrency = p.currency || "USD";

      let rzPlanId = p.razorpayPlanId;

      // 1. If Razorpay is configured and this is a paid plan without a razorpayPlanId
      if (
        rzInstance &&
        numAmount > 0 &&
        (!rzPlanId || rzPlanId.startsWith("plan_fallback_") || rzPlanId.includes("_auto"))
      ) {
        try {
          const razorpayPeriod =
            p.period?.toLowerCase() === "yearly" ? "yearly" : "monthly";

          const newRzPlan = await rzInstance.plans.create({
            period: razorpayPeriod,
            interval: 1,
            item: {
              name: `${p.slug} - ${p.period}`,
              amount: Math.round(numAmount * 100),
              currency: planCurrency,
              description: `${p.period} plan for ${p.slug}`,
            },
          });
          rzPlanId = newRzPlan.id;
        } catch (rzErr) {
          console.warn(
            `[updatePlansLogic] Razorpay API warning for ${p.slug} (${p.period}):`,
            rzErr.message,
          );
        }
      }

      // 2. If it's a free / trial plan, assign system fallback
      if (numAmount === 0 && !rzPlanId) {
        rzPlanId = `plan_free_${p.period?.toLowerCase() || "monthly"}`;
      }

      // 3. Update the BillingPlan in MongoDB
      const updateData = {
        slug: p.slug,
        amount: numAmount,
        currency: planCurrency,
        storage: numStorage,
        period: p.period,
      };

      if (rzPlanId) {
        updateData.razorpayPlanId = rzPlanId;
      }
      if (p.active !== undefined) {
        updateData.active = p.active;
      }

      const filter = p._id
        ? { _id: p._id }
        : { slug: p.slug, period: p.period };

      const updatedDoc = await BillingPlan.findOneAndUpdate(
        filter,
        { $set: updateData },
        { returnDocument: "after", upsert: true },
      ).lean();

      // 4. Synchronize PlanTierConfiguration limit
      if (numStorage > 0) {
        await PlanTierConfiguration.findOneAndUpdate(
          { slug: p.slug },
          { $set: { "rules.limits.storageLimit": numStorage } },
        );

        // 5. Update user maxStorage for users subscribed to this plan
        const subsForPlan = await Subscription.find({
          billingPlan: updatedDoc._id,
          status: { $in: ["active", "paused", "authenticated"] },
        })
          .select("_id userId")
          .lean();

        if (subsForPlan.length > 0) {
          const subIds = subsForPlan.map((s) => s._id);
          const userIds = subsForPlan.map((s) => s.userId).filter(Boolean);
          await User.updateMany(
            {
              $or: [
                { subscription: { $in: subIds } },
                { _id: { $in: userIds } },
              ],
            },
            { $set: { maxStorage: numStorage } },
          );
        }

        // 6. If this is a free trial plan, update all Free Trial users directly
        const isFreeTrialPlan =
          ["free-trial", "free-trail"].includes(p.slug) || updatedDoc.amount === 0;
        if (isFreeTrialPlan) {
          const freeTrialSubs = await Subscription.find({
            $or: [{ isFreeTrial: true }, { amount: 0 }],
            status: { $in: ["active", "paused", "authenticated"] },
          })
            .select("_id userId")
            .lean();

          if (freeTrialSubs.length > 0) {
            const freeTrialSubIds = freeTrialSubs.map((s) => s._id);
            const freeTrialUserIds = freeTrialSubs
              .map((s) => s.userId)
              .filter(Boolean);
            await User.updateMany(
              {
                $or: [
                  { subscription: { $in: freeTrialSubIds } },
                  { _id: { $in: freeTrialUserIds } },
                ],
              },
              { $set: { maxStorage: numStorage } },
            );
          }
        }
      }

      return updatedDoc;
    }),
  );

  await invalidateGlobalPlanCache();
  return updatedPlans;
};

export const updatePlanTiersLogic = async ({ tiers, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(
      new Error("Access denied. Only Owners can update plan tiers."),
      { status: 403 },
    );
  }

  const bulkOps = tiers.map((p) => ({
    updateOne: {
      filter: { _id: p._id },
      update: {
        $set: {
          slug: p.slug,
          title: p.title,
          description: p.description,
          badge: p.badge,
          accentColor: p.accentColor,
        },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await PlanTier.bulkWrite(bulkOps);
  }

  await invalidateGlobalPlanCache();
  return tiers;
};

export const updatePlanTierActiveLogic = async ({
  tierId,
  slug,
  bodyId,
  active,
  userRole,
}) => {
  if (userRole !== "Owner") {
    throw Object.assign(
      new Error("Access denied. Only Owners can update plan tiers."),
      { status: 403 },
    );
  }

  const filter = tierId
    ? { _id: tierId }
    : slug
      ? { slug }
      : bodyId
        ? { _id: bodyId }
        : null;

  if (!filter) {
    throw Object.assign(new Error("tierId, _id, or slug is required"), {
      status: 400,
    });
  }

  const updatedTier = await PlanTier.findOneAndUpdate(
    filter,
    { $set: { active } },
    { returnDocument: "after" },
  ).lean();

  if (!updatedTier) {
    throw Object.assign(new Error("Plan tier not found."), { status: 404 });
  }

  // Also update all associated billing plans active status
  await BillingPlan.updateMany(
    { slug: updatedTier.slug },
    { $set: { active } },
  );

  const updatedBillingPlans = await BillingPlan.find({
    slug: updatedTier.slug,
  }).lean();

  await invalidateGlobalPlanCache();

  return {
    updatedTier,
    updatedBillingPlans,
  };
};

export const updateFeaturesLogic = async ({ features, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(
      new Error("Access denied. Only Owners can update feature catalogue."),
      { status: 403 },
    );
  }

  const bulkOps = features.map((f) => ({
    updateOne: {
      filter: { _id: f._id },
      update: {
        $set: {
          category: f.category,
          description: f.description,
          enabled: f.enabled,
          title: f.title,
          updatedAt: Date.now(),
        },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await Feature.bulkWrite(bulkOps);
  }

  await invalidateGlobalPlanCache();
  return features;
};

export const updateTierConfigurationsLogic = async ({ configs, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(
      new Error("Access denied. Only Owners can update tier configurations."),
      { status: 403 },
    );
  }

  const { tierFeatureConfigs = {}, tierRuleConfigs = {} } = configs;
  console.log("[updateTierConfigurationsLogic] Received configs:", {
    tierFeatureConfigs,
    tierRuleConfigs,
  });

  const allFeatures = await Feature.find().lean();
  const featureKeyToId = {};
  allFeatures.forEach((f) => {
    if (f.key) {
      featureKeyToId[f.key] = f._id;
      featureKeyToId[f.key.toLowerCase()] = f._id;
    }
    if (f.slug) {
      featureKeyToId[f.slug] = f._id;
      featureKeyToId[f.slug.toLowerCase()] = f._id;
    }
    if (f.title) {
      featureKeyToId[f.title] = f._id;
      featureKeyToId[f.title.toLowerCase()] = f._id;
    }
  });

  const allTiers = await PlanTier.find().lean();
  const tierSlugToDoc = {};
  allTiers.forEach((t) => {
    if (t.slug) {
      tierSlugToDoc[t.slug] = t;
      tierSlugToDoc[t.slug.toLowerCase()] = t;
    }
    if (t.title) {
      tierSlugToDoc[t.title] = t;
      tierSlugToDoc[t.title.toLowerCase()] = t;
    }
  });

  const allSlugs = Array.from(
    new Set([
      ...Object.keys(tierFeatureConfigs),
      ...Object.keys(tierRuleConfigs),
    ]),
  );

  const bulkOps = allSlugs
    .map((slug) => {
      const tierDoc = tierSlugToDoc[slug] || tierSlugToDoc[slug.toLowerCase()];
      const featureKeys = tierFeatureConfigs[slug] || tierFeatureConfigs[slug.toLowerCase()] || [];
      const featureIds = featureKeys
        .map((key) => featureKeyToId[key] || featureKeyToId[key?.toLowerCase()])
        .filter(Boolean);
      const rawRules = tierRuleConfigs[slug] || tierRuleConfigs[slug.toLowerCase()] || {};

      // 1. Normalize Permissions
      const permissions = {
        allowUpload:
          rawRules.allowUpload !== undefined
            ? Boolean(rawRules.allowUpload)
            : (rawRules.permissions?.allowUpload ?? true),
        allowDownload:
          rawRules.allowDownload !== undefined
            ? Boolean(rawRules.allowDownload)
            : (rawRules.permissions?.allowDownload ?? true),
        allowSharing:
          rawRules.allowSharing !== undefined
            ? Boolean(rawRules.allowSharing)
            : (rawRules.permissions?.allowSharing ?? true),
        allowEdit:
          rawRules.allowEdit !== undefined
            ? Boolean(rawRules.allowEdit)
            : (rawRules.permissions?.allowEdit ?? true),
        allowMove:
          rawRules.allowMove !== undefined
            ? Boolean(rawRules.allowMove)
            : (rawRules.permissions?.allowMove ?? true),
        allowCopy:
          rawRules.allowCopy !== undefined
            ? Boolean(rawRules.allowCopy)
            : (rawRules.permissions?.allowCopy ?? true),
        allowDelete:
          rawRules.allowDelete !== undefined
            ? Boolean(rawRules.allowDelete)
            : (rawRules.permissions?.allowDelete ?? true),
      };

      // 2. Normalize Limits
      let maxUploadFileSize =
        rawRules.limits?.maxUploadFileSize ||
        rawRules.maxUploadFileSize ||
        0;

      if (rawRules.maxUploadSizeVal !== undefined) {
        const val = Number(rawRules.maxUploadSizeVal) || 0;
        const unit = rawRules.maxUploadSizeUnit || "GB";
        const multiplier =
          unit === "TB"
            ? 1024 * 1024 * 1024 * 1024
            : unit === "GB"
            ? 1024 * 1024 * 1024
            : 1024 * 1024;
        maxUploadFileSize = val * multiplier;
      }

      if (!maxUploadFileSize && rawRules.maxUploadSize) {
        maxUploadFileSize = Number(rawRules.maxUploadSize) || 5 * 1024 * 1024 * 1024;
      }

      const maxConnectedDevices = Number(
        rawRules.maxConnectedDevices ??
          rawRules.limits?.maxConnectedDevices ??
          5,
      );

      const storageLimit = Number(
        rawRules.storageLimit ??
          rawRules.limits?.storageLimit ??
          5 * 1024 * 1024 * 1024,
      );

      const limits = {
        storageLimit,
        maxConnectedDevices,
        maxUploadFileSize: maxUploadFileSize || 5 * 1024 * 1024 * 1024,
      };

      // 3. Normalize Settings
      const uploadSpeedMultiplier =
        Number(
          String(
            rawRules.uploadSpeedMultiplier ??
              rawRules.settings?.uploadSpeedMultiplier ??
              "1",
          ).replace(/[^0-9.]/g, ""),
        ) || 1;

      const deleteFilesAfterExpiryDays =
        Number(
          String(
            rawRules.deleteFilesAfterExpiry ??
              rawRules.deleteFilesAfterExpiryDays ??
              rawRules.settings?.deleteFilesAfterExpiryDays ??
              "0",
          ).replace(/[^0-9]/g, ""),
        ) || 0;

      const versionHistoryDays =
        Number(
          String(
            rawRules.versionHistoryDays ??
              rawRules.settings?.versionHistoryDays ??
              "30",
          ).replace(/[^0-9]/g, ""),
        ) || 30;

      const settings = {
        uploadSpeedMultiplier,
        deleteFilesAfterExpiryDays,
        versionHistoryDays,
      };

      const rules = {
        permissions,
        limits,
        settings,
        allowUpload: permissions.allowUpload,
        allowDownload: permissions.allowDownload,
        allowSharing: permissions.allowSharing,
        maxConnectedDevices,
        maxUploadSizeVal: rawRules.maxUploadSizeVal,
        maxUploadSizeUnit: rawRules.maxUploadSizeUnit,
        uploadSpeedMultiplier,
        deleteFilesAfterExpiry: rawRules.deleteFilesAfterExpiry,
        versionHistoryDays,
      };

      const tierId = tierDoc?._id;
      const targetSlug = tierDoc?.slug || slug;

      return {
        updateOne: {
          filter: tierId
            ? {
                $or: [
                  { tier: tierId },
                  { slug: targetSlug },
                  { slug: { $regex: new RegExp(`^${targetSlug}$`, "i") } },
                ],
              }
            : {
                $or: [
                  { slug: targetSlug },
                  { slug: { $regex: new RegExp(`^${targetSlug}$`, "i") } },
                ],
              },
          update: {
            $set: {
              ...(tierId ? { tier: tierId } : {}),
              slug: targetSlug,
              features: featureIds,
              rules,
            },
          },
          upsert: true,
        },
      };
    });

  if (bulkOps.length > 0) {
    await PlanTierConfiguration.bulkWrite(bulkOps);
  }

  // Also sync storageLimit from rules into BillingPlans and User accounts if set
  for (const slug of allSlugs) {
    const rules = tierRuleConfigs[slug] || tierRuleConfigs[slug.toLowerCase()];
    const storageLimit = Number(rules?.limits?.storageLimit);
    if (storageLimit && storageLimit > 0) {
      await BillingPlan.updateMany(
        { slug: { $regex: new RegExp(`^${slug}$`, "i") } },
        { $set: { storage: storageLimit } }
      );
      const subs = await Subscription.find({
        status: { $in: ["active", "paused", "authenticated"] },
      }).populate("billingPlan").lean();

      const matchedUserIds = subs
        .filter((s) => s.billingPlan?.slug?.toLowerCase() === slug.toLowerCase())
        .map((s) => s.userId)
        .filter(Boolean);

      if (matchedUserIds.length > 0) {
        await User.updateMany(
          { _id: { $in: matchedUserIds } },
          { $set: { maxStorage: storageLimit } },
        );
      }
    }
  }

  const updatedConfigs = await PlanTierConfiguration.find()
    .populate("tier")
    .populate("features")
    .lean();

  const updatedTierFeatureConfigs = {};
  const updatedTierRuleConfigs = {};

  updatedConfigs.forEach((config) => {
    const slugKey = config.slug || config.tier?.slug;
    if (slugKey) {
      const featureKeys = (config.features || []).map((f) =>
        typeof f === "object" ? f.key : f,
      );
      updatedTierFeatureConfigs[slugKey] = featureKeys;
      updatedTierRuleConfigs[slugKey] = config.rules || {};
      if (slugKey.toLowerCase() !== slugKey) {
        updatedTierFeatureConfigs[slugKey.toLowerCase()] = featureKeys;
        updatedTierRuleConfigs[slugKey.toLowerCase()] = config.rules || {};
      }
    }
  });

  await invalidateGlobalPlanCache();

  return {
    tierFeatureConfigs: updatedTierFeatureConfigs,
    tierRuleConfigs: updatedTierRuleConfigs,
  };
};

export const createPlanTierLogic = async ({ tierData, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(
      new Error("Access denied. Only Owners can create plan tiers."),
      { status: 403 },
    );
  }

  const { slug, title, description, badge, accentColor } = tierData;
  const slugKey = (
    slug ||
    tierData.type?.toLowerCase().replace(/\s+/g, "-") ||
    title?.toLowerCase().replace(/\s+/g, "-") ||
    "custom-tier"
  ).trim();

  const newTier = await PlanTier.findOneAndUpdate(
    { slug: slugKey },
    {
      $set: {
        slug: slugKey,
        title: title || slugKey,
        description: description || "",
        badge: badge || "",
        accentColor: accentColor || "rose",
        active: tierData.active !== undefined ? tierData.active : true,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  const defaultStorage = Number(tierData.storage) || 5 * 1024 ** 3;
  const defaultAmount = Number(tierData.amount) || 199;

  const isFreeTrial = ["free-trial", "free-trail"].includes(slugKey);
  const plans = isFreeTrial
    ? [
        {
          period: "Monthly",
          amount: 0,
          currency: "INR",
          storage: defaultStorage,
        },
      ]
    : [
        {
          period: "Monthly",
          amount: defaultAmount,
          currency: "INR",
          storage: defaultStorage,
        },
        {
          period: "Yearly",
          amount: defaultAmount > 0 ? Math.round(defaultAmount * 10) : 0,
          currency: "INR",
          storage: defaultStorage,
        },
      ];

  const createdBillingPlans = await Promise.all(
    plans.map(async (plan) => {
      let rzPlanId = null;
      if (plan.amount > 0 && rzInstance) {
        try {
          const newRzPlan = await rzInstance.plans.create({
            period: plan.period.toLowerCase(),
            interval: 1,
            item: {
              name: `${title || slugKey} - ${plan.period}`,
              amount: Math.round(plan.amount * 100),
              currency: plan.currency,
            },
          });
          rzPlanId = newRzPlan.id;
        } catch (rzErr) {
          console.warn(
            `[createPlanTier] Razorpay fallback used for ${slugKey}:`,
            rzErr.message,
          );
          rzPlanId = `plan_${slugKey}_${plan.period.toLowerCase()}_auto`;
        }
      } else {
        rzPlanId = `plan_${slugKey}_${plan.period.toLowerCase()}_free`;
      }

      return await BillingPlan.findOneAndUpdate(
        { slug: slugKey, period: plan.period },
        {
          $set: {
            tier: newTier._id,
            slug: slugKey,
            amount: plan.amount,
            currency: plan.currency,
            period: plan.period,
            storage: plan.storage,
            razorpayPlanId: rzPlanId,
            active: true,
          },
        },
        { upsert: true, returnDocument: "after" },
      );
    }),
  );

  // Auto-seed default PlanTierConfiguration
  const allFeatures = await Feature.find().select("_id");
  const newConfig = await PlanTierConfiguration.findOneAndUpdate(
    { $or: [{ tier: newTier._id }, { slug: slugKey }] },
    {
      $set: {
        tier: newTier._id,
        slug: slugKey,
        features: allFeatures.map((f) => f._id),
        rules: {
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
            storageLimit: defaultStorage,
            maxConnectedDevices: 5,
            maxUploadFileSize: 5 * 1024 * 1024 * 1024,
          },
          settings: {
            uploadSpeedMultiplier: 5,
            versionHistoryDays: 30,
            deleteFilesAfterExpiryDays: 0,
          },
        },
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  await invalidateGlobalPlanCache();

  return {
    newTier,
    createdBillingPlans,
    newConfig,
  };
};

export const activateFreeTrialLogic = async ({ userId, req }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }

  // 1. Check if current user has already used trial
  if (user.hasUsedFreeTrial) {
    throw Object.assign(
      new Error(
        "You have already used your 30-day Free Trial. Please select a paid plan.",
      ),
      { status: 400, code: "TRIAL_ALREADY_USED" },
    );
  }

  // 2. Enforce verified phone number requirement for trial abuse prevention
  if (!user.phone || !user.phoneVerified) {
    throw Object.assign(
      new Error("Phone number verification is required to claim the 30-day Free Trial."),
      { status: 403, code: "PHONE_VERIFICATION_REQUIRED" },
    );
  }

  // 3. Track entitlement for phone identity to block multi-account abuse
  const phoneHash = hashPhoneNumber(user.phone);

  // 4. Find the active free trial billing plan
  const freeTrialPlan =
    (await BillingPlan.findOne({
      slug: { $in: ["free-trial", "free-trail"] },
      active: true,
    })) ||
    (await BillingPlan.findOne({
      amount: 0,
      active: true,
    }));

  if (!freeTrialPlan) {
    throw Object.assign(
      new Error("Free Trial plan is not currently available."),
      { status: 404 },
    );
  }

  // 5. Look up inherited tier from system config to set storage dynamically
  const sysConfig = await SystemConfig.findOne({ key: "global" }).lean();
  const inheritedSlug = sysConfig?.freeTrialInheritedTier || "ultimate";
  const inheritedBillingPlan =
    (await BillingPlan.findOne({
      slug: inheritedSlug,
      active: true,
    }).lean()) ||
    (await BillingPlan.findOne({ slug: inheritedSlug }).lean());
  const inheritedConfig = await PlanTierConfiguration.findOne({
    slug: inheritedSlug,
  }).lean();

  const grantedStorage =
    inheritedBillingPlan?.storage ||
    inheritedConfig?.rules?.limits?.storageLimit ||
    freeTrialPlan.storage ||
    5368709120;

  // 6. Create active subscription record for the 30-Day Free Trial
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let subscription = null;
  try {
    await withTransaction(async (session) => {
      await TrialClaim.create(
        [
          {
            phoneHash,
            firstClaimedByUserId: user._id,
            claimedAt: now,
            claimedIp: req?.ip || req?.headers?.["x-forwarded-for"] || null,
          },
        ],
        { session },
      );

      const [createdSub] = await Subscription.create(
        [
          {
            userId: user._id,
            billingPlan: freeTrialPlan._id,
            razorpaySubscriptionId: `trial_${user._id}_${Date.now()}`,
            amount: 0,
            status: "active",
            isFreeTrial: true,
            activatedAt: now,
            currentStart: now,
            currentEnd: trialEnd,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
            chargeAt: trialEnd,
          },
        ],
        { session },
      );
      subscription = createdSub;

      user.subscription = subscription._id;
      user.hasUsedFreeTrial = true;
      user.noSubscriptionSince = null;
      user.noPlanSince = null;
      user.maxStorage = grantedStorage;
      await user.save({ session });
    });
  } catch (claimErr) {
    if (claimErr.code === 11000) {
      throw Object.assign(
        new Error(
          "This phone number has already been used to claim a 30-day Free Trial. Please select a paid plan.",
        ),
        { status: 403, code: "TRIAL_ALREADY_CLAIMED" },
      );
    }
    throw claimErr;
  }

  await invalidateUserSessions(user._id.toString());

  // Trigger subscription activated notification & resolve past warnings
  await subscriptionActivated({
    userId: user._id,
    subscriptionId: subscription._id,
    planName: "30-Day Free Trial",
  }).catch((nErr) => {
    console.warn("[PlanService] Free trial notification error:", nErr.message);
  });

  return {
    success: true,
    message: "30-Day Free Trial activated successfully!",
    subscription,
    billingPlan: freeTrialPlan,
  };
};
