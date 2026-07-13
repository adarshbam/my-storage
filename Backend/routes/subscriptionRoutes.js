import express from "express";
import { createSubscription } from "../controllers/subscriptionController.js";
import checkAuth from "../middlewares/authMiddleware.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.post(
  "/create-subscription",
  checkAuth,
  throttle(50, 20, "subcription-create"),
  createSubscription,
);

export default router;
