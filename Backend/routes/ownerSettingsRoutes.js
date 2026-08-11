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

const router = express.Router();

// GET /owner-settings — Fetch all owner settings
router.get("/", checkAuth, getOwnerSettings);

// PATCH /owner-settings/global — Update global system limits
router.patch("/global", checkAuth, updateGlobalLimits);
router.post("/global", checkAuth, updateGlobalLimits);

// POST /owner-settings/tier — Create a new plan tier
router.post("/tier", checkAuth, createPlanTier);
router.post("/tiers/create", checkAuth, createPlanTier);

// PATCH /owner-settings/tier/active — Toggle plan tier active state
router.patch("/tier/active", checkAuth, updatePlanTierActive);

// PATCH /owner-settings/tiers — Update all plan tiers
router.patch("/tiers", checkAuth, updatePlanTiers);

// PATCH /owner-settings/features — Update feature catalogue
router.patch("/features", checkAuth, updateFeatures);
router.post("/features", checkAuth, updateFeatures);

// PATCH /owner-settings/configurations — Update plan tier feature/rule configurations
router.patch("/configurations", checkAuth, updateTierConfigurations);
router.post("/configurations", checkAuth, updateTierConfigurations);

// PATCH /owner-settings/reset — Reset all owner settings to defaults
router.patch("/reset", checkAuth, resetToDefaultSettings);

export default router;
