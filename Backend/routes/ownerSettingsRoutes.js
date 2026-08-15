import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import resetToDefaultSettings from "../utils/syncDefaultPlans.js";
import {
  getOwnerSettings,
  updateGlobalLimits,
  updatePlanTiers,
  updatePlanTierActive,
  createPlanTier,
  updateFeatures,
  updateTierConfigurations,
} from "../controllers/planController.js";
import { lightReadLimiter, adminLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// GET /owner-settings — Fetch all owner settings
router.get(
  "/",
  checkAuth,
  lightReadLimiter,
  throttle(100, 15, "owner-settings-get"),
  getOwnerSettings,
);

// PATCH /owner-settings/global — Update global system limits
router.patch(
  "/global",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-global"),
  updateGlobalLimits,
);
router.post(
  "/global",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-global"),
  updateGlobalLimits,
);

// POST /owner-settings/tier — Create a new plan tier
router.post(
  "/tier",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-tier-create"),
  createPlanTier,
);
router.post(
  "/tiers/create",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-tier-create"),
  createPlanTier,
);

// PATCH /owner-settings/tier/active — Toggle plan tier active state
router.patch(
  "/tier/active",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-tier-active"),
  updatePlanTierActive,
);

// PATCH /owner-settings/tiers — Update all plan tiers
router.patch(
  "/tiers",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-tiers-update"),
  updatePlanTiers,
);

// PATCH /owner-settings/features — Update feature catalogue
router.patch(
  "/features",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-features"),
  updateFeatures,
);
router.post(
  "/features",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-features"),
  updateFeatures,
);

// PATCH /owner-settings/configurations — Update plan tier feature/rule configurations
router.patch(
  "/configurations",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-configs"),
  updateTierConfigurations,
);
router.post(
  "/configurations",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "owner-configs"),
  updateTierConfigurations,
);

// PATCH /owner-settings/reset — Reset all owner settings to defaults
router.patch(
  "/reset",
  checkAuth,
  adminLimiter,
  throttle(500, 2, "owner-reset"),
  resetToDefaultSettings,
);

export default router;
