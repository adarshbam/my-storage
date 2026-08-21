import Feature from "../models/featureModel.js";

export const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      const planContext = req.planContext || {};
      const features = planContext.features || [];

      // 1. Check if the feature is globally disabled in database
      const globalFeature = await Feature.findOne({
        $or: [{ key: featureKey }, { slug: featureKey }],
      }).lean();

      if (globalFeature && globalFeature.enabled === false) {
        return res.status(403).json({
          success: false,
          code: "FEATURE_GLOBALLY_DISABLED",
          error: `Feature '${globalFeature.title || featureKey}' is currently disabled globally by the system administrator.`,
          message: "This feature has been temporarily deactivated on the platform.",
          featureKey,
        });
      }

      // 2. Check if user's tier has this feature active
      const hasFeature = features.some(
        (feature) =>
          (feature.key === featureKey ||
            feature.slug === featureKey ||
            feature.name === featureKey) &&
          feature.enabled !== false,
      );

      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          code: "FEATURE_NOT_IN_PLAN",
          error: `Feature '${featureKey}' is not included in your current plan.`,
          message: planContext.isNoPlan
            ? "No active plan found. Please activate your free trial or choose a plan to unlock this feature."
            : `Your current tier does not have the '${featureKey}' feature enabled.`,
          featureKey,
          isNoPlan: !!planContext.isNoPlan,
          canUseFreeTrial: !!planContext.canUseFreeTrial,
          daysUntilPurge: planContext.daysUntilPurge,
        });
      }

      next();
    } catch (err) {
      console.error("[requireFeature] Error:", err);
      next(err);
    }
  };
};

