import express from "express";
import { handleRazorpayWebhook } from "../controllers/webhookController.js";
import { webhookLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// Razorpay webhook (no auth — Razorpay calls this directly)
router.post(
  "/razorpay",
  webhookLimiter,
  throttle(100, 50, "webhook-razorpay"),
  handleRazorpayWebhook,
);

export default router;
