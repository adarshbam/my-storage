import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  verifyFirebasePhone,
  checkTrialEligibility,
} from "../controllers/phoneVerificationController.js";
import {
  phoneOtpSendLimiter,
  phoneOtpVerifyLimiter,
  lightReadLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// Request SMS OTP to verify phone (Server fallback provider)
router.post(
  "/send-otp",
  checkAuth,
  phoneOtpSendLimiter,
  throttle(2000, 1, "phone-otp-send"),
  sendPhoneOtp
);

// Submit OTP to link & verify phone
router.post(
  "/verify-otp",
  checkAuth,
  phoneOtpVerifyLimiter,
  throttle(1000, 3, "phone-otp-verify"),
  verifyPhoneOtp
);

// Verify client-validated Firebase phone token (100% Free Forever)
router.post(
  "/verify-firebase",
  checkAuth,
  phoneOtpVerifyLimiter,
  throttle(1000, 3, "phone-firebase-verify"),
  verifyFirebasePhone
);

// Check if a canonical phone is eligible for free trial
router.get(
  "/trial-eligibility",
  checkAuth,
  lightReadLimiter,
  throttle(500, 5, "phone-trial-check"),
  checkTrialEligibility
);

export default router;

