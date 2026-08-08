import express from "express";
import {
  createPlanSchema,
  updatePlansSchema,
} from "../validators/planSchema.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  createPlan,
  getAllActivePlans,
  updatePlans,
} from "../controllers/planController.js";

const router = express.Router();

router.get("/get-active-plans", getAllActivePlans);

// Create a new Razorpay Plan (authenticated)
router.post("/create-plan", checkAuth, validate(createPlanSchema), createPlan);

// Batch update all plans (authenticated)
router.patch("/update-plans", checkAuth, validate(updatePlansSchema), updatePlans);
router.post("/update-plans", checkAuth, validate(updatePlansSchema), updatePlans);

export default router;
