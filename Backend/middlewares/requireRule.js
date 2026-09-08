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

    if ((planContext.isNoPlan || planContext.isNoSubscription) && ruleName !== "allowDownload") {
      const canTrial = !!planContext.canUseFreeTrial;
      const trialMsg = canTrial
        ? "No active storage subscription found. Start your 30-Day Free Trial or choose a subscription plan to upload files."
        : "No active storage subscription found. Please choose a subscription plan to upload files.";
      return res.status(403).json({
        success: false,
        code: "NO_ACTIVE_PLAN",
        error: trialMsg,
        message: trialMsg,
        isNoPlan: true,
        isNoSubscription: true,
        canUseFreeTrial: canTrial,
        daysUntilPurge: planContext.daysUntilPurge,
      });
    }

    // If permission is explicitly set to false in the plan configuration
    if (permissions[ruleName] === false) {
      const permMsg = `Action forbidden: your current plan does not allow ${ruleName}.`;
      return res.status(403).json({
        success: false,
        code: "PERMISSION_DENIED",
        error: permMsg,
        message: `Your current plan does not include the ${ruleName} permission.`,
        isNoPlan: !!planContext.isNoPlan,
        isNoSubscription: !!planContext.isNoSubscription,
        canUseFreeTrial: !!planContext.canUseFreeTrial,
        daysUntilPurge: planContext.daysUntilPurge,
      });
    }

    next();
  };
};

