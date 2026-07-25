import express from "express";
import { createSubscription } from "../controllers/subscriptionController.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { createSubscriptionSchema } from "../validators/subscriptionSchema.js";

const router = express.Router();

// Create a new Razorpay subscription (authenticated)
router.post(
  "/create-subscription",
  checkAuth,
  validate(createSubscriptionSchema),
  createSubscription,
);

export default router;
