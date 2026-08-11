import { rzInstance } from "../integrations/razorpay/razorpay.client.js";
import BillingPlan from "../models/billingPlanModel.js";
import Feature from "../models/featureModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";
import SystemConfig from "../models/systemConfigModel.js";

export const createPlanLogic = async ({ planData, userId, userRole }) => {
  const { slug, amount, storage, period, currency } = planData;

  console.log(planData);

  if (userRole != "Owner") {
    throw Object.assign(new Error("You are forbidden to perform this action"), { status: 403 });
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

  const disablingPlans = await BillingPlan.updateMany(
    {
      slug,
      period,
    },
    {
      active: false,
    },
  );

  console.log(disablingPlans);

  const plan = await BillingPlan.create({
    razorpayPlanId: newPlan.id,
    slug,
    amount,
    currency: planCurrency,
    period,
    storage,
  });

  console.log("[Plan] Created:", plan.razorpayPlanId);

  return {
    plan: plan.razorpayPlanId,
  };
};

export const planTierManagementLogic = async ({ planData, userId, userRole }) => {
  const { type, amount, storage, period, currency } = planData;

  console.log(planData);

  if (userRole != "Owner") {
    throw Object.assign(new Error("You are forbidden to perform this action"), { status: 403 });
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
    throw Object.assign(new Error("Access denied. Only Owners can view settings."), { status: 403 });
  }

  // TODO: fetch and return all owner settings
  const systemConfig = await SystemConfig.findOne({ key: "global" }).lean();
  const features = await Feature.find().lean();

  const planTiers = await PlanTier.find().lean();
  const planTierConfigurations = await PlanTierConfiguration.find()
    .populate("features")
    .lean();
  const billingPlans = await BillingPlan.find({ active: true }).lean();

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
    throw Object.assign(new Error("Access denied. Only Owners can update settings."), { status: 403 });
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
  } = limits;

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

  return systemConfig;
};

export const updatePlansLogic = async ({ plans, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(new Error("Access denied. Only Owners can update billing plans."), { status: 403 });
  }

  if (!Array.isArray(plans) || plans.length === 0) {
    throw Object.assign(new Error("Plans array is required"), { status: 400 });
  }

  const updatedPlans = await Promise.all(
    plans.map(async (p) => {
      const planCurrency = (p.currency || "INR").toUpperCase();
      const numAmount = Number(p.amount) || 0;
      const numStorage = Number(p.storage) || 0;

      // 1. Fetch current document to detect changes
      const currentDoc = p._id ? await BillingPlan.findById(p._id) : null;

      const isAmountChanged = !currentDoc || currentDoc.amount !== numAmount;
      const isPeriodChanged = !currentDoc || currentDoc.period !== p.period;
      const isCurrencyChanged =
        !currentDoc || currentDoc.currency !== planCurrency;
      const hasRazorpayPlan =
        currentDoc &&
        currentDoc.razorpayPlanId &&
        currentDoc.razorpayPlanId.trim() !== "";

      let rzPlanId = currentDoc?.razorpayPlanId;

      // 2. If amount, period, or currency changed, or missing razorpayPlanId
      if (
        isAmountChanged ||
        isPeriodChanged ||
        isCurrencyChanged ||
        !hasRazorpayPlan
      ) {
        // Check if an existing plan already has this exact configuration and Razorpay Plan ID
        const existingMatchingPlan = await BillingPlan.findOne({
          slug: p.slug,
          amount: numAmount,
          period: p.period,
          currency: planCurrency,
          razorpayPlanId: { $exists: true, $ne: "" },
        });

        if (existingMatchingPlan?.razorpayPlanId) {
          rzPlanId = existingMatchingPlan.razorpayPlanId;
        } else {
          // Create a new Razorpay Plan
          const zeroDecimalCurrencies = ["JPY", "KRW"];
          const rzAmount = zeroDecimalCurrencies.includes(planCurrency)
            ? Math.round(numAmount)
            : Math.round(numAmount * 100);

          try {
            const newRzPlan = await rzInstance.plans.create({
              period: p.period.toLowerCase(),
              interval: 1,
              item: {
                name: `${p.slug} - ${p.period}`,
                amount: rzAmount,
                currency: planCurrency,
              },
            });
            rzPlanId = newRzPlan.id;
            console.log(
              `[updatePlans] Created new Razorpay plan for ${p.slug} (${p.period}):`,
              rzPlanId,
            );
          } catch (rzErr) {
            console.error(
              `[updatePlans] Razorpay plan creation error for ${p.slug}:`,
              rzErr?.error?.description || rzErr.message || rzErr,
            );
          }
        }
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

      return updatedDoc;
    }),
  );

  return updatedPlans;
};

export const updatePlanTiersLogic = async ({ tiers, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(new Error("Access denied. Only Owners can update plan tiers."), { status: 403 });
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

  return tiers;
};

export const updatePlanTierActiveLogic = async ({ tierId, slug, bodyId, active, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(new Error("Access denied. Only Owners can update plan tiers."), { status: 403 });
  }

  const filter = tierId
    ? { _id: tierId }
    : slug
      ? { slug }
      : bodyId
        ? { _id: bodyId }
        : null;

  if (!filter) {
    throw Object.assign(new Error("tierId, _id, or slug is required"), { status: 400 });
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

  return {
    updatedTier,
    updatedBillingPlans,
  };
};

export const updateFeaturesLogic = async ({ features, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(new Error("Access denied. Only Owners can update feature catalogue."), { status: 403 });
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

  return features;
};

export const updateTierConfigurationsLogic = async ({ configs, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(new Error("Access denied. Only Owners can update tier configurations."), { status: 403 });
  }

  const { tierFeatureConfigs = {}, tierRuleConfigs = {} } = configs;
  console.log("[updateTierConfigurationsLogic] Received configs:", {
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
    ]),
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
        typeof f === "object" ? f.key : f,
      );
      updatedTierRuleConfigs[slugKey] = config.rules || {};
    }
  });

  return {
    tierFeatureConfigs: updatedTierFeatureConfigs,
    tierRuleConfigs: updatedTierRuleConfigs,
  };
};

export const createPlanTierLogic = async ({ tierData, userRole }) => {
  if (userRole !== "Owner") {
    throw Object.assign(new Error("Access denied. Only Owners can create plan tiers."), { status: 403 });
  }

  const { slug, title, description, badge, accentColor } = tierData;
  console.log(tierData);

  const newTier = await PlanTier.create({
    slug,
    title,
    description,
    badge,
    accentColor,
  });

  await BillingPlan.updateMany({ slug }, { active: false });

  const plans = ["Monthly", "Yearly"].map((period) => ({
    name: `${slug} - ${period}`,
    period,
    currency: "INR",
    amount: 0,
    storage: 5 * 1024 ** 3,
  }));

  const razorpayPlans = await Promise.all(
    plans.map((plan) =>
      rzInstance.plans.create({
        period: plan.period.toLowerCase(),
        interval: 1,
        item: {
          name: plan.name,
          amount: plan.amount,
          currency: plan.currency,
        },
      }),
    ),
  );

  const createdBillingPlans = await BillingPlan.create(
    plans.map((plan, i) => ({
      razorpayPlanId: razorpayPlans[i].id,
      slug,
      amount: plan.amount,
      currency: plan.currency,
      period: plan.period,
      storage: plan.storage,
      active: true,
    })),
  );

  return {
    newTier,
    createdBillingPlans,
  };
};
