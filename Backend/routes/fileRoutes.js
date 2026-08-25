import express from "express";

import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import checkAuth from "../middlewares/authMiddleware.js";

import {
  deleteFile,
  getCdnUrl,
  getFileById,
  getThumbnail,
  getThumbnailCdnUrl,
  markFileOpened,
  renameFile,
  search,
  uploadFile,
  saveFile,
  getAllStarredItems,
  getAllRecentItems,
  setStarredItem,
  uploadVaultInitate,
  uploadVaultComplete,
  uploadVaultAbort,
  uploadVaultMultipartInitiate,
  uploadVaultMultipartPartUrl,
  uploadVaultMultipartComplete,
  uploadVaultMultipartAbort,
} from "../controllers/fileController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  searchSchema,
  getThumbnailSchema,
  getThumbnailCdnUrlSchema,
  getCdnUrlSchema,
  getFileByIdSchema,
  markFileOpenedSchema,
  uploadFileSchema,
  renameFileSchema,
  saveFileSchema,
  deleteFileSchema,
  uploadVaultInitiateSchema,
  uploadVaultCompleteSchema,
  uploadVaultAbortSchema,
  uploadVaultMultipartInitiateSchema,
  uploadVaultMultipartPartUrlSchema,
  uploadVaultMultipartCompleteSchema,
  uploadVaultMultipartAbortSchema,
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
  "/:fileId/thumbnail/cdn-url",
  checkAuth,
  thumbnailLimiter,
  validate(getThumbnailCdnUrlSchema),
  getThumbnailCdnUrl,
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

router.post(
  "/starred",
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

router.post(
  "/:fileId/opened",
  checkAuth,
  directoryReadLimiter,
  validate(markFileOpenedSchema),
  markFileOpened,
);

router.get(
  "/:fileId/cdn-url",
  checkAuth,
  directoryReadLimiter,
  validate(getCdnUrlSchema),
  getCdnUrl,
);

router.get(
  "/:fileId/download",
  checkAuth,
  loadPlanContext,
  requireRule("allowDownload"),
  directoryReadLimiter,
  validate(getFileByIdSchema),
  getFileById,
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
  "/upload-vault/complete",
  checkAuth,
  standardWriteLimiter,
  validate(uploadVaultCompleteSchema),
  uploadVaultComplete,
);

router.post(
  "/upload-vault/abort",
  checkAuth,
  standardWriteLimiter,
  validate(uploadVaultAbortSchema),
  uploadVaultAbort,
);

router.post(
  "/upload-vault/multipart/initiate",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  uploadLimiter,
  throttle(300, 8, "file-upload"),
  validate(uploadVaultMultipartInitiateSchema),
  enforceUploadLimit,
  uploadVaultMultipartInitiate,
);

router.post(
  "/upload-vault/multipart/part-url",
  checkAuth,
  uploadLimiter,
  validate(uploadVaultMultipartPartUrlSchema),
  uploadVaultMultipartPartUrl,
);

router.post(
  "/upload-vault/multipart/complete",
  checkAuth,
  standardWriteLimiter,
  validate(uploadVaultMultipartCompleteSchema),
  uploadVaultMultipartComplete,
);

router.post(
  "/upload-vault/multipart/abort",
  checkAuth,
  standardWriteLimiter,
  validate(uploadVaultMultipartAbortSchema),
  uploadVaultMultipartAbort,
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
