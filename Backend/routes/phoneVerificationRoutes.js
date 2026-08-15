import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  checkTrialEligibility,
} from "../controllers/phoneVerificationController.js";
import { phoneOtpLimiter, lightReadLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// Request SMS OTP to verify phone
router.post(
  "/send-otp",
  checkAuth,
  phoneOtpLimiter,
  throttle(3000, 1, "phone-otp-send"),
  sendPhoneOtp
);

// Submit OTP to link & verify phone
router.post(
  "/verify-otp",
  checkAuth,
  phoneOtpLimiter,
  throttle(1000, 3, "phone-otp-verify"),
  verifyPhoneOtp
);

// Check if a canonical phone is eligible for free trial
router.get(
  "/trial-eligibility",
  checkAuth,
  lightReadLimiter,
  throttle(50, 10, "phone-trial-check"),
  checkTrialEligibility
);

export default router;
