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
} from "../middlewares/rateLimiter.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("fileId", validateIdMiddleware);

// Search Endpoint - MUST BE BEFORE /:fileId
router.get("/search", checkAuth, searchLimiter, validate(searchSchema), search);

router.get("/:fileId/thumbnail", checkAuth, thumbnailLimiter, validate(getThumbnailSchema), getThumbnail);

router.get("/:fileId", checkAuth, validate(getFileByIdSchema), getFileById);

// Allow both root upload (no param) and param upload
// Note: router.param middleware will NOT run for "/"
router.post(["/", "/:parentDirId"], checkAuth, uploadLimiter, validate(uploadFileSchema), uploadFile);

router.patch("/:fileId", checkAuth, validate(renameFileSchema), renameFile);
router.put("/:fileId/save", checkAuth, validate(saveFileSchema), saveFile);
router.delete("/:fileId", checkAuth, validate(deleteFileSchema), deleteFile);

export default router;
