export const checkPlanLimit = ({ rule, getValue }) => {
  return (req, res, next) => {
    const limit = req.planContext.rules.limits[rule];

    const value = getValue(req);

    if (value > limit) {
      return res.status(413).json({
        message: "Plan limit exceeded.",
      });
    }

    next();
  };
};
