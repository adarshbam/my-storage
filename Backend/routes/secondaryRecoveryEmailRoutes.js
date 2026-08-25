import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  sendSecondaryRecoveryEmailOtp,
  verifySecondaryRecoveryEmailOtp,
  removeSecondaryRecoveryEmail,
} from "../controllers/secondaryRecoveryEmailController.js";
import {
  recoveryEmailSendLimiter,
  recoveryEmailVerifyLimiter,
  standardWriteLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// 1. Send OTP to proposed secondary recovery email
router.post(
  "/send-otp",
  checkAuth,
  recoveryEmailSendLimiter,
  throttle(2000, 1, "sec-email-otp-send"),
  sendSecondaryRecoveryEmailOtp
);

// 2. Submit OTP to verify and save secondary recovery email
router.post(
  "/verify-otp",
  checkAuth,
  recoveryEmailVerifyLimiter,
  throttle(1000, 3, "sec-email-otp-verify"),
  verifySecondaryRecoveryEmailOtp
);

// 3. Remove secondary recovery email
router.delete(
  "/",
  checkAuth,
  standardWriteLimiter,
  throttle(1000, 3, "sec-email-remove"),
  removeSecondaryRecoveryEmail
);

export default router;
