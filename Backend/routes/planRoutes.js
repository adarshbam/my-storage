import express from "express";
import { createPlanSchema } from "../validators/planSchema.js";
import checkAuth from "../middlewares/authMiddleware";
import { validate } from "../middlewares/validationMiddleware.js";
import { createPlan } from "../controllers/planController.js";
const router = express.Router();

// Create a new Razorpay Plan (authenticated)
router.post("/create-plan", checkAuth, validate(createPlanSchema), createPlan);

export default router;
