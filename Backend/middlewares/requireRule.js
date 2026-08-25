export const requireRule = (ruleName) => {
  return (req, res, next) => {
    const planContext = req.planContext || {};
    const permissions = planContext.rules?.permissions || {};

    // For paused or read-only/no-plan accounts, non-download actions are restricted
    if (planContext.isPaused && ruleName !== "allowDownload") {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_PAUSED",
        error: "Your subscription is currently paused. Please resume your subscription to restore full upload and modification access.",
        message: "Your subscription is paused. Resume to continue uploading.",
        isPaused: true,
      });
    }

    if (planContext.isNoPlan && ruleName !== "allowDownload") {
      return res.status(403).json({
        success: false,
        code: "NO_ACTIVE_PLAN",
        error: `Action forbidden: your current plan does not allow ${ruleName}.`,
        message: "No active plan found. Please activate your free trial or choose a plan to continue.",
        isNoPlan: true,
        canUseFreeTrial: !!planContext.canUseFreeTrial,
        daysUntilPurge: planContext.daysUntilPurge,
      });
    }

    // If permission is explicitly set to false in the plan configuration
    if (permissions[ruleName] === false) {
      return res.status(403).json({
        success: false,
        code: "PERMISSION_DENIED",
        error: `Action forbidden: your current plan does not allow ${ruleName}.`,
        message: `Your current plan does not include the ${ruleName} permission.`,
        isNoPlan: !!planContext.isNoPlan,
        canUseFreeTrial: !!planContext.canUseFreeTrial,
        daysUntilPurge: planContext.daysUntilPurge,
      });
    }

    next();
  };
};

