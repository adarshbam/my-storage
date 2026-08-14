export const requireFeature = (featureKey) => {
  return (req, res, next) => {
    const planContext = req.planContext || {};
    const features = planContext.features || [];

    const hasFeature = features.some(
      (feature) =>
        feature.key === featureKey ||
        feature.slug === featureKey ||
        feature.name === featureKey,
    );

    if (!hasFeature) {
      return res.status(403).json({
        success: false,
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
  };
};

