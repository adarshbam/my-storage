export const requireFeature = (featureKey) => {
  return (req, res, next) => {
    const hasFeature = req.planContext.features.some(
      (feature) => feature.key === featureKey,
    );

    if (!hasFeature) {
      return res.status(403).json({
        success: false,

        message: `Feature not availabele in this plan.`,
      });
    }

    next();
  };
};
