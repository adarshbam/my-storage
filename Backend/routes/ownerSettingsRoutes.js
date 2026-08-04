import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import resetToDefaultSettings from "../utils/syncDefaultPlans.js";

const router = express.Router();

// PATCH /owner-settings/reset — Reset all owner settings to defaults
router.patch("/reset", checkAuth, resetToDefaultSettings);

export default router;
