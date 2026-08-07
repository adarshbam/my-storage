import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import resetToDefaultSettings from "../utils/syncDefaultPlans.js";
import {
  getOwnerSettings,
  updateGlobalLimits,
} from "../controllers/planController.js";

const router = express.Router();

// GET /owner-settings — Fetch all owner settings
router.get("/", checkAuth, getOwnerSettings);

// POST /owner-settings/global — Update global system limits
router.patch("/global", checkAuth, updateGlobalLimits);

// PATCH /owner-settings/reset — Reset all owner settings to defaults
router.patch("/reset", checkAuth, resetToDefaultSettings);

export default router;
