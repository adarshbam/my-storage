import express from "express";
import { sendOtp, verifyOtp } from "../controllers/otpController.js";
import { otpLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.post("/send", otpLimiter, sendOtp);
router.post("/verify", otpLimiter, verifyOtp);

export default router;
