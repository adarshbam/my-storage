import express from "express";
import {
  connectGoogleDrive,
  listDriveFiles, // ← Uncomment when implemented
} from "../controllers/driveController.js";
import checkAuth from "../middlewares/authMiddleware.js";

const router = express.Router();

// Step 1: The frontend sends the authorization code here to exchange for tokens
router.post("/connect", checkAuth, connectGoogleDrive);

// Step 2: Uncomment when listDriveFiles is implemented in driveController.js
router.get("/files", checkAuth, listDriveFiles);

export default router;
