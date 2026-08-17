import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import { loadPlanContext } from "../middlewares/loadPlanContext.js";
import { requireRule } from "../middlewares/requireRule.js";
import {
  batchDelete,
  deleteDirectoryForever,
  deleteFileForever,
  emptyTrash,
  getTrashItems,
  restoreDirectory,
  restoreFile,
} from "../controllers/trashController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  restoreFileSchema,
  deleteFileForeverSchema,
  restoreDirectorySchema,
  deleteDirectoryForeverSchema,
  batchDeleteSchema,
} from "../validators/trashSchema.js";
import {
  heavyOpLimiter,
  standardWriteLimiter,
  directoryReadLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.get(
  "/",
  checkAuth,
  directoryReadLimiter,
  getTrashItems,
);
router.delete(
  "/",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  heavyOpLimiter,
  throttle(5000, 1, "trash-empty"),
  emptyTrash,
);
router.post(
  "/:id/restore",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(200, 10, "trash-restore-file"),
  validate(restoreFileSchema),
  restoreFile,
);
router.delete(
  "/:fileid",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(200, 10, "trash-delete-file"),
  validate(deleteFileForeverSchema),
  deleteFileForever,
);
router.post(
  "/directory/:dirId/restore",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(200, 10, "trash-restore-dir"),
  validate(restoreDirectorySchema),
  restoreDirectory,
);
router.delete(
  "/directory/:dirId",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(200, 10, "trash-delete-dir"),
  validate(deleteDirectoryForeverSchema),
  deleteDirectoryForever,
);
router.post(
  "/delete-batch",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  heavyOpLimiter,
  throttle(5000, 1, "trash-batch-delete"),
  validate(batchDeleteSchema),
  batchDelete,
);

export default router;
