import BillingPlan from "../models/billingPlanModel.js";
import PlanTierConfiguration from "../models/planTierConfigurationModel.js";
import PlanTier from "../models/planTierModel.js";

export const loadPlanContext = async (req, res, next) => {
  const user = req.user;

  const billingPlan = await BillingPlan.findById(user.billingPlan).lean();

  const planTier = await PlanTier.findById(billingPlan.tier).lean();

  const configuration = await PlanTierConfiguration.findOne({
    tier: planTier._id,
  })
    .populate("features")
    .lean();

  req.planContext = {
    billingPlan,
    planTier,
    features: configuration.features,
    rules: configuration.rules,
  };

  next();
};
