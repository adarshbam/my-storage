import express from "express";
import {
  connectGoogleDrive,
  listDriveFiles,
  listDriveFolder,
  getFileFromDrive,
  createDriveFolder,
  uploadFileToDrive,
  deleteFromDrive,
  downloadDriveFolder,
  searchDriveFiles,
  disconnectGoogleDrive,
  updateDriveItem,
  moveDriveItems,
  transferToVault,
  transferFromVault,
} from "../controllers/driveController.js";
import checkAuth from "../middlewares/authMiddleware.js";

const router = express.Router();

// ── Auth ─────────────────────────────────────────────────────────────────────
// Exchange the Google OAuth code for tokens and save to user
router.post("/connect", checkAuth, connectGoogleDrive);

// Disconnect Google Drive
router.post("/disconnect", checkAuth, disconnectGoogleDrive);

// ── Listing ───────────────────────────────────────────────────────────────────
// Root of My Drive (items whose parent is "root")
router.get("/files", checkAuth, listDriveFiles);
// Contents of a specific Drive folder
router.get("/folder/:folderId", checkAuth, listDriveFolder);

// ── File operations ───────────────────────────────────────────────────────────
// Preview or download a single file (?action=download)
router.get("/file/:fileId", checkAuth, getFileFromDrive);
// Delete a file or folder from Drive
router.delete("/file/:fileId", checkAuth, deleteFromDrive);
// Upload a file into a Drive folder (or "root" for Drive root)
router.post("/file/:parentFolderId/upload", checkAuth, uploadFileToDrive);
// Update or Move a file/folder
router.patch("/file/:fileId", checkAuth, updateDriveItem);
// Bulk move items
router.post("/move", checkAuth, moveDriveItems);
// Cross-provider transfer
router.post("/transfer-to-vault", checkAuth, transferToVault);
router.post("/transfer-from-vault", checkAuth, transferFromVault);

// ── Folder operations ─────────────────────────────────────────────────────────
// Create a new folder inside a Drive folder
router.post(
  "/folder/:parentFolderId/create-folder",
  checkAuth,
  createDriveFolder,
);
// Download an entire folder as a .zip
router.get("/folder/:folderId/download", checkAuth, downloadDriveFolder);

// Search on drive
router.get("/search", checkAuth, searchDriveFiles);

export default router;
