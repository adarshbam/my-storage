import express from "express";
import { getSystemConfig, updateSystemConfig } from "../controllers/systemConfigController.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { lightReadLimiter, adminLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.get(
  "/",
  checkAuth,
  lightReadLimiter,
  throttle(100, 15, "sysconfig-get"),
  getSystemConfig,
);
router.patch(
  "/",
  checkAuth,
  adminLimiter,
  throttle(300, 5, "sysconfig-update"),
  updateSystemConfig,
);

export default router;
