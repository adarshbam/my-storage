import express from "express";
import { getInvoices } from "../controllers/billingController.js";
import checkAuth from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/billing/invoices (authenticated)
router.get("/invoices", checkAuth, getInvoices);

export default router;
