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
} from "../validators/fileSchema.js";
import {
  searchLimiter,
  thumbnailLimiter,
  uploadLimiter,
  standardWriteLimiter,
  mediumWriteLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("fileId", validateIdMiddleware);

// Search Endpoint - MUST BE BEFORE /:fileId
router.get(
  "/search",
  checkAuth,
  searchLimiter,
  throttle(200, 10, "file-search"),
  validate(searchSchema),
  search,
);

router.get(
  "/:fileId/thumbnail",
  checkAuth,
  thumbnailLimiter,
  throttle(50, 20, "thumbnail"),
  validate(getThumbnailSchema),
  getThumbnail,
);

router.get(
  "/starred",
  checkAuth,
  standardWriteLimiter,
  throttle(50, 12, "file-get"),
  getAllStarredItems,
);

router.get(
  "/recent",
  checkAuth,
  standardWriteLimiter,
  throttle(50, 12, "file-get"),
  getAllRecentItems,
);

router.get(
  "/:fileId",
  checkAuth,
  standardWriteLimiter,
  throttle(50, 12, "file-get"),
  validate(getFileByIdSchema),
  getFileById,
);

// Allow both root upload (no param) and param upload
// Note: router.param middleware will NOT run for "/"
router.post(
  ["/", "/:parentDirId"],
  checkAuth,
  uploadLimiter,
  throttle(300, 8, "file-upload"),
  validate(uploadFileSchema),
  uploadFile,
);

router.patch(
  "/:fileId",
  checkAuth,
  standardWriteLimiter,
  throttle(100, 12, "file-rename"),
  validate(renameFileSchema),
  renameFile,
);
router.put(
  "/:fileId/save",
  checkAuth,
  mediumWriteLimiter,
  throttle(300, 8, "file-save"),
  validate(saveFileSchema),
  saveFile,
);
router.delete(
  "/:fileId",
  checkAuth,
  standardWriteLimiter,
  throttle(100, 12, "file-delete"),
  validate(deleteFileSchema),
  deleteFile,
);

export default router;
