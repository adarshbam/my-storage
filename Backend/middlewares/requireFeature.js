import Feature from "../models/featureModel.js";

export const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      const planContext = req.planContext || {};
      const features = planContext.features || [];
      const normalize = (s) => (s || "").toLowerCase().replace(/[-_\s]+/g, "");
      const target = normalize(featureKey);

      // 1. Check if the feature is globally disabled in database
      const globalFeature = await Feature.findOne({
        $or: [
          { key: featureKey },
          { slug: featureKey },
          { key: { $regex: new RegExp(`^${featureKey}$`, "i") } },
          { title: { $regex: new RegExp(`^${featureKey}$`, "i") } },
        ],
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
      const hasFeature = features.some((feature) => {
        if (!feature) return false;
        if (typeof feature === "string") {
          const normF = normalize(feature);
          return normF === target || (target.includes("gdrive") && normF.includes("gdrive")) || (target.includes("googledrive") && (normF.includes("gdrive") || normF.includes("googledrive")));
        }
        const k = normalize(feature.key);
        const s = normalize(feature.slug);
        const n = normalize(feature.name);
        const t = normalize(feature.title);

        if (feature.enabled === false) return false;

        if (k === target || s === target || n === target || t === target) return true;
        if ((target === "gdrivesync" || target === "googledrive" || target === "googledriveintegration") &&
            (k === "gdrivesync" || k === "googledrive" || k === "googledriveintegration" || t.includes("googledrive") || t.includes("gdrive"))) {
          return true;
        }
        if ((target === "githubbackup" || target === "github" || target === "githubintegration") &&
            (k === "githubbackup" || k === "github" || t.includes("github"))) {
          return true;
        }
        return false;
      });

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

