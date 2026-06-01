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
import { validate } from "../middlewares/validationMiddleware.js";
import {
  connectGoogleDriveSchema,
  listDriveFolderSchema,
  getFileFromDriveSchema,
  deleteFromDriveSchema,
  uploadFileToDriveSchema,
  updateDriveItemSchema,
  moveDriveItemsSchema,
  transferToVaultSchema,
  transferFromVaultSchema,
  searchDriveFilesSchema,
} from "../validators/driveSchema.js";
import { heavyOpLimiter, mediumWriteLimiter, standardWriteLimiter, searchLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// ── Auth ─────────────────────────────────────────────────────────────────────
// Exchange the Google OAuth code for tokens and save to user
router.post("/connect", checkAuth, heavyOpLimiter, throttle(500, 5, "drive-connect"), validate(connectGoogleDriveSchema), connectGoogleDrive);

// Disconnect Google Drive
router.post("/disconnect", checkAuth, mediumWriteLimiter, throttle(300, 5, "drive-disconnect"), disconnectGoogleDrive);

// ── Listing ───────────────────────────────────────────────────────────────────
// Root of My Drive (items whose parent is "root")
router.get("/files", checkAuth, standardWriteLimiter, throttle(100, 15, "drive-list"), listDriveFiles);
// Contents of a specific Drive folder
router.get("/folder/:folderId", checkAuth, standardWriteLimiter, throttle(100, 15, "drive-folder"), validate(listDriveFolderSchema), listDriveFolder);

// ── File operations ───────────────────────────────────────────────────────────
// Preview or download a single file (?action=download)
router.get("/file/:fileId", checkAuth, standardWriteLimiter, throttle(100, 12, "drive-file-get"), validate(getFileFromDriveSchema), getFileFromDrive);
// Delete a file or folder from Drive
router.delete("/file/:fileId", checkAuth, mediumWriteLimiter, throttle(300, 8, "drive-file-delete"), validate(deleteFromDriveSchema), deleteFromDrive);
// Upload a file into a Drive folder (or "root" for Drive root)
router.post("/file/:parentFolderId/upload", checkAuth, mediumWriteLimiter, throttle(300, 8, "drive-upload"), validate(uploadFileToDriveSchema), uploadFileToDrive);
// Update or Move a file/folder
router.patch("/file/:fileId", checkAuth, mediumWriteLimiter, throttle(300, 8, "drive-update"), validate(updateDriveItemSchema), updateDriveItem);
// Bulk move items
router.post("/move", checkAuth, mediumWriteLimiter, throttle(300, 8, "drive-move"), validate(moveDriveItemsSchema), moveDriveItems);
// Cross-provider transfer
router.post("/transfer-to-vault", checkAuth, heavyOpLimiter, throttle(5000, 1, "drive-transfer-to"), validate(transferToVaultSchema), transferToVault);
// Cross-provider transfer from Vault to Google Drive
router.post("/transfer-from-vault", checkAuth, heavyOpLimiter, throttle(5000, 1, "drive-transfer-from"), validate(transferFromVaultSchema), transferFromVault);

// ── Folder operations ─────────────────────────────────────────────────────────
// Create a new folder inside a Drive folder
router.post(
  "/folder/:parentFolderId/create-folder",
  checkAuth,
  mediumWriteLimiter,
  throttle(300, 8, "drive-folder-create"),
  validate(uploadFileToDriveSchema), // Same schema: requires parentFolderId in params
  createDriveFolder,
);
// Download an entire folder as a .zip
router.get("/folder/:folderId/download", checkAuth, heavyOpLimiter, throttle(5000, 1, "drive-folder-download"), validate(listDriveFolderSchema), downloadDriveFolder);

// Search on drive
router.get("/search", checkAuth, searchLimiter, throttle(200, 10, "drive-search"), validate(searchDriveFilesSchema), searchDriveFiles);

export default router;
