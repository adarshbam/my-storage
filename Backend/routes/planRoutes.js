import express from "express";
import { createPlanSchema } from "../validators/planSchema.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  createPlan,
  getAllActivePlans,
} from "../controllers/planController.js";
const router = express.Router();

router.get("/get-active-plans", getAllActivePlans);

// Create a new Razorpay Plan (authenticated)
router.post("/create-plan", checkAuth, validate(createPlanSchema), createPlan);

export default router;
