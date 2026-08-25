import express from "express";
import { sendOtp, verifyOtp } from "../controllers/otpController.js";
import { otpSendLimiter, otpVerifyLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.post("/send", otpSendLimiter, throttle(2000, 1, "otp-send"), sendOtp);
router.post("/verify", otpVerifyLimiter, throttle(1000, 3, "otp-verify"), verifyOtp);

export default router;
