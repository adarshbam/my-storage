import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  setupTwoFactor,
  verifyTwoFactorSetup,
  verifyTwoFactorLogin,
  disableTwoFactor,
  regenerateRecoveryCodes,
} from "../controllers/twoFactorController.js";
import { twoFactorLimiter, loginLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// 1. Generate TOTP secret and QR code (authenticated)
router.post(
  "/setup",
  checkAuth,
  twoFactorLimiter,
  throttle(2000, 2, "2fa-setup"),
  setupTwoFactor
);

// 2. Confirm TOTP setup with code and generate recovery codes (authenticated)
router.post(
  "/verify-setup",
  checkAuth,
  twoFactorLimiter,
  throttle(1000, 3, "2fa-verify-setup"),
  verifyTwoFactorSetup
);

// 3. Verify TOTP or Recovery Code during login (unauthenticated, requires tempToken)
router.post(
  "/verify-login",
  loginLimiter,
  twoFactorLimiter,
  throttle(1000, 5, "2fa-verify-login"),
  verifyTwoFactorLogin
);

// 4. Disable 2FA with password or TOTP verification (authenticated)
router.post(
  "/disable",
  checkAuth,
  twoFactorLimiter,
  throttle(2000, 2, "2fa-disable"),
  disableTwoFactor
);

// 5. Regenerate recovery codes (authenticated)
router.post(
  "/recovery-codes/regenerate",
  checkAuth,
  twoFactorLimiter,
  throttle(2000, 2, "2fa-regen-rc"),
  regenerateRecoveryCodes
);

export default router;
