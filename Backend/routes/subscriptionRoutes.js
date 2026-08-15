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
import {
  lightReadLimiter,
  subscriptionLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// Get current subscription status & details
router.get(
  "/current",
  checkAuth,
  lightReadLimiter,
  throttle(100, 15, "sub-status"),
  getCurrentSubscription,
);
router.get(
  "/status",
  checkAuth,
  lightReadLimiter,
  throttle(100, 15, "sub-status"),
  getCurrentSubscription,
);

// Create a new Razorpay subscription (authenticated)
router.post(
  "/create-subscription",
  checkAuth,
  subscriptionLimiter,
  throttle(1000, 3, "sub-create"),
  validate(createSubscriptionSchema),
  createSubscription,
);

// Subscription Action Endpoints
router.post(
  "/:id/pause",
  checkAuth,
  subscriptionLimiter,
  throttle(1000, 3, "sub-pause"),
  pauseSubscription,
);
router.post(
  "/:id/resume",
  checkAuth,
  subscriptionLimiter,
  throttle(1000, 3, "sub-resume"),
  resumeSubscription,
);
router.post(
  "/:id/cancel",
  checkAuth,
  subscriptionLimiter,
  throttle(1000, 3, "sub-cancel"),
  cancelSubscription,
);
router.post(
  "/change-plan",
  checkAuth,
  subscriptionLimiter,
  throttle(1000, 3, "sub-change"),
  changePlan,
);

export default router;
