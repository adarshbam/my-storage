import {
  createPlanLogic,
  planTierManagementLogic,
  getAllActivePlansLogic,
  getOwnerSettingsLogic,
  updateGlobalLimitsLogic,
  updatePlansLogic,
  updatePlanTiersLogic,
  updatePlanTierActiveLogic,
  updateFeaturesLogic,
  updateTierConfigurationsLogic,
  createPlanTierLogic,
  activateFreeTrialLogic,
} from "../services/plan.service.js";
import { invalidatePlanContextCache } from "../middlewares/loadPlanContext.js";

export const createPlan = async (req, res, next) => {
  try {
    const result = await createPlanLogic({
      planData: req.body,
      userId: req.user.id,
      userRole: req.user.role
    });
    return res.json(result);
  } catch (err) {
    console.error("[Plan] Error:", err?.error || err?.message || err);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const planTierManagement = async (req, res, next) => {
  try {
    const result = await planTierManagementLogic({
      planData: req.body,
      userId: req.user.id,
      userRole: req.user.role
    });
    return res.json(result);
  } catch (err) {
    console.error("[Plan] Error:", err?.error || err?.message || err);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const getAllActivePlans = async (req, res, next) => {
  try {
    const result = await getAllActivePlansLogic();
    return res.json(result);
  } catch (err) {
    console.error("[Plan] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const getUserPlanContext = async (req, res, next) => {
  try {
    return res.status(200).json(req.planContext);
  } catch (err) {
    console.error("[getUserPlanContext] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const activateFreeTrial = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const result = await activateFreeTrialLogic({ userId, req });
    await invalidatePlanContextCache(userId);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[activateFreeTrial] Error:", err.message);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Failed to activate Free Trial",
      code: err.code || "TRIAL_ACTIVATION_FAILED",
    });
  }
};

export const getOwnerSettings = async (req, res, next) => {
  try {
    const result = await getOwnerSettingsLogic({ userRole: req.user?.role });
    return res.json(result);
  } catch (err) {
    console.error("[OwnerSettings] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const updateGlobalLimits = async (req, res, next) => {
  try {
    const result = await updateGlobalLimitsLogic({ limits: req.body, userRole: req.user?.role });
    return res.json(result);
  } catch (err) {
    console.error("[OwnerSettings] Error updating global limits:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const updatePlans = async (req, res, next) => {
  try {
    const result = await updatePlansLogic({ plans: req.body.plans || (Array.isArray(req.body) ? req.body : []), userRole: req.user?.role });
    return res.json(result);
  } catch (err) {
    console.error("[updatePlans] Error:", err?.error || err.message || err);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const updatePlanTiers = async (req, res, next) => {
  try {
    const result = await updatePlanTiersLogic({ tiers: req.body.tiers || (Array.isArray(req.body) ? req.body : []), userRole: req.user?.role });
    return res.json(result);
  } catch (err) {
    console.error("[updatePlanTiers] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const updatePlanTierActive = async (req, res, next) => {
  try {
    console.log("[updatePlanTierActive] req.body:", req.body);
    const { tierId, slug, active } = req.body;
    const result = await updatePlanTierActiveLogic({ tierId, slug, bodyId: req.body._id, active, userRole: req.user?.role });
    return res.json(result);
  } catch (err) {
    console.error("[updatePlanTierActive] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const updateFeatures = async (req, res, next) => {
  try {
    const result = await updateFeaturesLogic({ features: req.body.features || (Array.isArray(req.body) ? req.body : []), userRole: req.user?.role });
    return res.json(result);
  } catch (err) {
    console.error("[updateFeatures] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const updateTierConfigurations = async (req, res, next) => {
  try {
    const result = await updateTierConfigurationsLogic({ configs: req.body, userRole: req.user?.role });
    return res.json(result);
  } catch (err) {
    console.error("[updateTierConfigurations] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};

export const createPlanTier = async (req, res, next) => {
  try {
    const result = await createPlanTierLogic({ tierData: req.body, userRole: req.user?.role });
    return res.status(201).json(result);
  } catch (err) {
    console.error("[createPlanTier] Error:", err.message);
    if (err.status) res.status(err.status);
    next(err);
  }
};
