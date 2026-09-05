import express from "express";
import { testLimiter } from "../middlewares/rateLimiter.js";
import {
  getDeployTest,
  getTestOne,
  getTestTwo,
} from "../controllers/testController.js";

const router = express.Router();

// Apply rate limiter so public requests are protected
router.use(testLimiter);

// Main /test route
router.get("/", getDeployTest);

// Sub-routes for granular checks (e.g. /test/1, /test/2, /test/test1, /test/test2)
router.get("/1", getTestOne);
router.get("/test1", getTestOne);
router.get("/test-1", getTestOne);

router.get("/2", getTestTwo);
router.get("/test2", getTestTwo);
router.get("/test-2", getTestTwo);

export default router;
