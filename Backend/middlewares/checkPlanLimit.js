export const requireRule = (ruleName) => {
  return (req, res, next) => {
    const rules = req.planContext.rules;

    if (!rules[ruleName]) {
      return res.status(403).json({
        success: false,

        message: `Your plan does not allow ${ruleName}.`,
      });
    }

    next();
  };
};
