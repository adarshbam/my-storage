import express from "express";
import { getSystemConfig, updateSystemConfig } from "../controllers/systemConfigController.js";
import checkAuth from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", checkAuth, getSystemConfig);
router.patch("/", checkAuth, updateSystemConfig);

export default router;
