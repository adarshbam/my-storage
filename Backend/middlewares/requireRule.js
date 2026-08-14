export const requireRule = (ruleName) => {
  return (req, res, next) => {
    const planContext = req.planContext || {};
    const permissions = planContext.rules?.permissions || {};

    if (!permissions[ruleName]) {
      return res.status(403).json({
        success: false,
        error: `Action forbidden: your current plan does not allow ${ruleName}.`,
        message: planContext.isNoPlan
          ? "No active plan found. Please activate your free trial or choose a plan to continue."
          : `Your current plan does not include the ${ruleName} permission.`,
        isNoPlan: !!planContext.isNoPlan,
        canUseFreeTrial: !!planContext.canUseFreeTrial,
        daysUntilPurge: planContext.daysUntilPurge,
      });
    }

    next();
  };
};

