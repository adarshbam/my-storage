import express from "express";
import {
  createPlanSchema,
  updatePlansSchema,
} from "../validators/planSchema.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { loadPlanContext } from "../middlewares/loadPlanContext.js";
import {
  createPlan,
  getAllActivePlans,
  getUserPlanContext,
  activateFreeTrial,
  updatePlans,
} from "../controllers/planController.js";
import {
  lightReadLimiter,
  trialActivationLimiter,
  subscriptionLimiter,
  adminLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.get(
  "/get-active-plans",
  lightReadLimiter,
  getAllActivePlans,
);

// Get current user plan context with features, rules, limits, tier & billing plan
router.get(
  "/context",
  checkAuth,
  lightReadLimiter,
  loadPlanContext,
  getUserPlanContext,
);
router.get(
  "/current-plan-context",
  checkAuth,
  lightReadLimiter,
  loadPlanContext,
  getUserPlanContext,
);

// 1-Click Free Trial Activation
router.post(
  "/activate-free-trial",
  checkAuth,
  trialActivationLimiter,
  throttle(2000, 1, "plan-trial"),
  activateFreeTrial,
);
router.post(
  "/activate-trial",
  checkAuth,
  trialActivationLimiter,
  throttle(2000, 1, "plan-trial"),
  activateFreeTrial,
);

// Create a new Razorpay Plan (authenticated)
router.post(
  "/create-plan",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "plan-create"),
  validate(createPlanSchema),
  createPlan,
);

// Batch update all plans (authenticated)
router.patch(
  "/update-plans",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "plans-update"),
  validate(updatePlansSchema),
  updatePlans,
);
router.post(
  "/update-plans",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "plans-update"),
  validate(updatePlansSchema),
  updatePlans,
);

export default router;

