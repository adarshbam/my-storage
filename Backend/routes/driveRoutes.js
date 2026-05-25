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

const router = express.Router();

// ── Auth ─────────────────────────────────────────────────────────────────────
// Exchange the Google OAuth code for tokens and save to user
router.post("/connect", checkAuth, validate(connectGoogleDriveSchema), connectGoogleDrive);

// Disconnect Google Drive
router.post("/disconnect", checkAuth, disconnectGoogleDrive);

// ── Listing ───────────────────────────────────────────────────────────────────
// Root of My Drive (items whose parent is "root")
router.get("/files", checkAuth, listDriveFiles);
// Contents of a specific Drive folder
router.get("/folder/:folderId", checkAuth, validate(listDriveFolderSchema), listDriveFolder);

// ── File operations ───────────────────────────────────────────────────────────
// Preview or download a single file (?action=download)
router.get("/file/:fileId", checkAuth, validate(getFileFromDriveSchema), getFileFromDrive);
// Delete a file or folder from Drive
router.delete("/file/:fileId", checkAuth, validate(deleteFromDriveSchema), deleteFromDrive);
// Upload a file into a Drive folder (or "root" for Drive root)
router.post("/file/:parentFolderId/upload", checkAuth, validate(uploadFileToDriveSchema), uploadFileToDrive);
// Update or Move a file/folder
router.patch("/file/:fileId", checkAuth, validate(updateDriveItemSchema), updateDriveItem);
// Bulk move items
router.post("/move", checkAuth, validate(moveDriveItemsSchema), moveDriveItems);
// Cross-provider transfer
router.post("/transfer-to-vault", checkAuth, validate(transferToVaultSchema), transferToVault);
// Cross-provider transfer from Vault to Google Drive
router.post("/transfer-from-vault", checkAuth, validate(transferFromVaultSchema), transferFromVault);

// ── Folder operations ─────────────────────────────────────────────────────────
// Create a new folder inside a Drive folder
router.post(
  "/folder/:parentFolderId/create-folder",
  checkAuth,
  validate(uploadFileToDriveSchema), // Same schema: requires parentFolderId in params
  createDriveFolder,
);
// Download an entire folder as a .zip
router.get("/folder/:folderId/download", checkAuth, validate(listDriveFolderSchema), downloadDriveFolder);

// Search on drive
router.get("/search", checkAuth, validate(searchDriveFilesSchema), searchDriveFiles);

export default router;
