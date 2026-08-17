import express from "express";

import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import checkAuth from "../middlewares/authMiddleware.js";

import {
  deleteFile,
  getFileById,
  getThumbnail,
  renameFile,
  search,
  uploadFile,
  saveFile,
  getAllStarredItems,
  getAllRecentItems,
  setStarredItem,
  uploadVaultInitate,
} from "../controllers/fileController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  searchSchema,
  getThumbnailSchema,
  getFileByIdSchema,
  uploadFileSchema,
  renameFileSchema,
  saveFileSchema,
  deleteFileSchema,
  uploadVaultInitiateSchema,
} from "../validators/fileSchema.js";
import {
  searchLimiter,
  thumbnailLimiter,
  uploadLimiter,
  standardWriteLimiter,
  directoryReadLimiter,
  mediumWriteLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";
import { enforceUploadLimit } from "../middlewares/enforceUploadLimit.js";
import { loadPlanContext } from "../middlewares/loadPlanContext.js";
import { requireRule } from "../middlewares/requireRule.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("fileId", validateIdMiddleware);

// Search Endpoint - MUST BE BEFORE /:fileId
router.get(
  "/search",
  checkAuth,
  searchLimiter,
  validate(searchSchema),
  search,
);

router.get(
  "/:fileId/thumbnail",
  checkAuth,
  thumbnailLimiter,
  validate(getThumbnailSchema),
  getThumbnail,
);

router.post(
  "/:fileId/starred",
  checkAuth,
  standardWriteLimiter,
  throttle(50, 12, "file-starred"),
  setStarredItem,
);

router.get(
  "/starred",
  checkAuth,
  directoryReadLimiter,
  getAllStarredItems,
);

router.get(
  "/recent",
  checkAuth,
  directoryReadLimiter,
  getAllRecentItems,
);

router.get(
  "/:fileId",
  checkAuth,
  directoryReadLimiter,
  validate(getFileByIdSchema),
  getFileById,
);

// Allow both root upload (no param) and param upload
// Note: router.param middleware will NOT run for "/"

router.post(
  "/upload-vault/initiate",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  uploadLimiter,
  throttle(300, 8, "file-upload"),
  validate(uploadVaultInitiateSchema),
  enforceUploadLimit,
  uploadVaultInitate,
);

router.post(
  ["/", "/:parentDirId"],
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  uploadLimiter,
  throttle(300, 8, "file-upload"),
  validate(uploadFileSchema),
  enforceUploadLimit,
  uploadFile,
);

router.patch(
  "/:fileId",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(100, 12, "file-rename"),
  validate(renameFileSchema),
  renameFile,
);
router.put(
  "/:fileId/save",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  mediumWriteLimiter,
  throttle(300, 8, "file-save"),
  validate(saveFileSchema),
  saveFile,
);
router.delete(
  "/:fileId",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(100, 12, "file-delete"),
  validate(deleteFileSchema),
  deleteFile,
);

export default router;
