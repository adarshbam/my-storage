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

const router = express.Router();

router.get("/get-active-plans", getAllActivePlans);

// Get current user plan context with features, rules, limits, tier & billing plan
router.get("/context", checkAuth, loadPlanContext, getUserPlanContext);
router.get("/current-plan-context", checkAuth, loadPlanContext, getUserPlanContext);

// 1-Click Free Trial Activation
router.post("/activate-free-trial", checkAuth, activateFreeTrial);

// Create a new Razorpay Plan (authenticated)
router.post("/create-plan", checkAuth, validate(createPlanSchema), createPlan);

// Batch update all plans (authenticated)
router.patch("/update-plans", checkAuth, validate(updatePlansSchema), updatePlans);
router.post("/update-plans", checkAuth, validate(updatePlansSchema), updatePlans);

export default router;

