import express from "express";
import {
  createSubscription,
  getCurrentSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  changePlan,
} from "../controllers/subscriptionController.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { createSubscriptionSchema } from "../validators/subscriptionSchema.js";

const router = express.Router();

// Get current subscription status & details
router.get("/current", checkAuth, getCurrentSubscription);
router.get("/status", checkAuth, getCurrentSubscription);

// Create a new Razorpay subscription (authenticated)
router.post(
  "/create-subscription",
  checkAuth,
  validate(createSubscriptionSchema),
  createSubscription,
);

// Subscription Action Endpoints (Minimal Scaffolding for Assignment)
router.post("/:id/pause", checkAuth, pauseSubscription);
router.post("/:id/resume", checkAuth, resumeSubscription);
router.post("/:id/cancel", checkAuth, cancelSubscription);
router.post("/change-plan", checkAuth, changePlan);

export default router;
