import { rzInstance } from "../config/config.js";
import BillingPlan from "../models/billingPlanModel.js";
import Feature from "../models/featureModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";
import SystemConfig from "../models/systemConfigModel.js";

export const createPlan = async (req, res, next) => {
  const { type, amount, storage, period, currency } = req.body;

  console.log(req.body);

  if (req.user.role != "Owner")
    return res.status(403).json("You are forbidden to perform this action");

  try {
    const planCurrency = (currency || "INR").toUpperCase();
    const existingPlan = await BillingPlan.findOne({
      type,
      amount,
      period,
    });
    console.log(existingPlan);

    if (existingPlan) {
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

    const plan = await BillingPlan.create({
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

export const planTierManagement = async (req, res, next) => {
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

export const getOwnerSettings = async (req, res, next) => {
  try {
    if (req.user?.role !== "Owner") {
      return res
        .status(403)
        .json({ error: "Access denied. Only Owners can view settings." });
    }

    // TODO: fetch and return all owner settings
    const systemConfig = await SystemConfig.findOne({ key: "global" }).lean();
    const features = await Feature.find().lean();

    const planTiers = await PlanTier.find().lean();
    const planTierConfigurations = await PlanTierConfiguration.find()
      .populate("features")
      .lean();
    const billingPlans = await BillingPlan.find({ active: true }).lean();

    console.log(planTierConfigurations);

    const tierFeatureConfigs = {};
    const tierRuleConfigs = {};

    planTierConfigurations.forEach((config) => {
      const slugKey = config.slug || config.tier?.slug;
      if (slugKey) {
        tierFeatureConfigs[slugKey] = (config.features || []).map((f) =>
          typeof f === "object" ? f.key : f,
        );
        tierRuleConfigs[slugKey] = config.rules || {};
      }
    });

    return res.json({
      limits: systemConfig,
      planTiers,
      billingPlans,
      features,
      tierFeatureConfigs,
      tierRuleConfigs,
    });
  } catch (err) {
    console.error("[OwnerSettings] Error:", err.message);
    next(err);
  }
};

export const updateGlobalLimits = async (req, res, next) => {
  try {
    if (req.user?.role !== "Owner") {
      return res
        .status(403)
        .json({ error: "Access denied. Only Owners can update settings." });
    }

    // TODO: Update global system config in DB using req.body
    const {
      maxDevicesLimit,
      maxFileSizeLimit,
      defaultStorageUnit,
      maxFileSizeUnit,
      maxFileSizeValue,
      sessionTimeoutUnit,
      sessionTimeoutValue,
    } = req.body;
    console.log(
      maxDevicesLimit,
      maxFileSizeLimit,
      defaultStorageUnit,
      maxFileSizeUnit,
      maxFileSizeValue,
      sessionTimeoutUnit,
      sessionTimeoutValue,
    );

    const systemConfig = await SystemConfig.findOneAndUpdate(
      { key: "global" },
      {
        maxDevicesLimit,
        maxFileSizeLimit,
        defaultStorageUnit,
        maxFileSizeUnit,
        maxFileSizeValue,
        sessionTimeoutUnit,
        sessionTimeoutValue,
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    ).lean();

    return res.json(systemConfig);
  } catch (err) {
    console.error("[OwnerSettings] Error updating global limits:", err.message);
    next(err);
  }
};

export const updatePlans = async (req, res, next) => {
  try {
    if (req.user?.role !== "Owner") {
      return res.status(403).json({
        error: "Access denied. Only Owners can update billing plans.",
      });
    }

    const plans = req.body.plans || (Array.isArray(req.body) ? req.body : []);
    if (!Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ error: "Plans array is required" });
    }

    const bulkOps = plans.map((p) => ({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            slug: p.slug,
            amount: p.amount,
            currency: p.currency,
            storage: p.storage,
            period: p.period,
            active: p.active,
          },
        },
      },
    }));

    await BillingPlan.bulkWrite(bulkOps);
    const updatedBillingPlans = await BillingPlan.find({ active: true }).lean();

    return res.json(updatedBillingPlans);
  } catch (err) {
    console.error("[updatePlans] Error:", err.message);
    next(err);
  }
};

export const updatePlanTiers = async (req, res, next) => {
  try {
    if (req.user?.role !== "Owner") {
      return res.status(403).json({
        error: "Access denied. Only Owners can update plan tiers.",
      });
    }

    const planTiers = req.body;
    console.log(planTiers);

    const bulkOps = planTiers.map((p) => ({
      updateOne: {
        filter: { _id: p._id },
        update: {
          $set: {
            slug: p.slug,
            title: p.title,
            description: p.description,
            badge: p.badge,
            accentColor: p.accentColor,
            active: p.active,
          },
        },
      },
    }));

    await PlanTier.bulkWrite(bulkOps);
    const updatedPlanTiers = await PlanTier.find().lean();

    return res.json(updatedPlanTiers);
  } catch (err) {
    console.error("[updatePlanTiers] Error:", err.message);
    next(err);
  }
};

export const updateFeatures = async (req, res, next) => {
  try {
    if (req.user?.role !== "Owner") {
      return res.status(403).json({
        error: "Access denied. Only Owners can update feature catalogue.",
      });
    }

    const features = req.body;
    console.log(features);

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

    await Feature.bulkWrite(bulkOps);
    const updatedFeatures = await Feature.find().lean();

    return res.json(updatedFeatures);
  } catch (err) {
    console.error("[updateFeatures] Error:", err.message);
    next(err);
  }
};

export const updateTierConfigurations = async (req, res, next) => {
  try {
    if (req.user?.role !== "Owner") {
      return res.status(403).json({
        error: "Access denied. Only Owners can update tier configurations.",
      });
    }

    const { tierFeatureConfigs = {}, tierRuleConfigs = {} } = req.body;
    console.log("[updateTierConfigurations] Received configs:", {
      tierFeatureConfigs,
      tierRuleConfigs,
    });

    const allFeatures = await Feature.find().lean();
    const featureKeyToId = {};
    allFeatures.forEach((f) => {
      featureKeyToId[f.key] = f._id;
    });

    const allTiers = await PlanTier.find().lean();
    const tierSlugToDoc = {};
    allTiers.forEach((t) => {
      tierSlugToDoc[t.slug] = t;
    });

    const allSlugs = Array.from(
      new Set([
        ...Object.keys(tierFeatureConfigs),
        ...Object.keys(tierRuleConfigs),
      ])
    );

    const bulkOps = allSlugs
      .filter((slug) => tierSlugToDoc[slug])
      .map((slug) => {
        const tierDoc = tierSlugToDoc[slug];
        const featureKeys = tierFeatureConfigs[slug] || [];
        const featureIds = featureKeys
          .map((key) => featureKeyToId[key])
          .filter(Boolean);
        const rules = tierRuleConfigs[slug] || {};

        return {
          updateOne: {
            filter: { tier: tierDoc._id },
            update: {
              $set: {
                tier: tierDoc._id,
                slug,
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

    const updatedConfigs = await PlanTierConfiguration.find()
      .populate("features")
      .lean();

    const updatedTierFeatureConfigs = {};
    const updatedTierRuleConfigs = {};

    updatedConfigs.forEach((config) => {
      const slugKey = config.slug || config.tier?.slug;
      if (slugKey) {
        updatedTierFeatureConfigs[slugKey] = (config.features || []).map((f) =>
          typeof f === "object" ? f.key : f
        );
        updatedTierRuleConfigs[slugKey] = config.rules || {};
      }
    });

    return res.json({
      tierFeatureConfigs: updatedTierFeatureConfigs,
      tierRuleConfigs: updatedTierRuleConfigs,
    });
  } catch (err) {
    console.error("[updateTierConfigurations] Error:", err.message);
    next(err);
  }
};

export const createPlanTier = async (req, res, next) => {
  try {
    if (req.user?.role !== "Owner") {
      return res.status(403).json({
        error: "Access denied. Only Owners can create plan tiers.",
      });
    }

    console.log("[createPlanTier] req.body:", req.body);

    return res.status(201).json(req.body);
  } catch (err) {
    console.error("[createPlanTier] Error:", err.message);
    next(err);
  }
};
