import express from "express";
import { sendOtp, verifyOtp } from "../controllers/otpController.js";
import { otpLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.post("/send", otpLimiter, throttle(3000, 1, "otp-send"), sendOtp);
router.post("/verify", otpLimiter, throttle(1000, 3, "otp-verify"), verifyOtp);

export default router;
