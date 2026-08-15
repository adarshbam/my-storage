import express from "express";
import { getInvoices } from "../controllers/billingController.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { lightReadLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// GET /api/billing/invoices (authenticated)
router.get("/invoices", checkAuth, lightReadLimiter, throttle(100, 15, "billing-invoices"), getInvoices);

export default router;
