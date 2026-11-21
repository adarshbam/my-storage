import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { loadPlanContext } from "../middlewares/loadPlanContext.js";
import { requireRule } from "../middlewares/requireRule.js";
import {
  createDirectory,
  deleteDirectory,
  getDirectoryById,
  moveItems,
  renameDirectory,
  copyItems,
  deleteItemsBatch,
} from "../controllers/directoryController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  getDirectoryByIdSchema,
  createDirectorySchema,
  renameDirectorySchema,
  deleteDirectorySchema,
  moveDirectorySchema,
  copyDirectorySchema,
  deleteDirectoryBatchSchema,
} from "../validators/directorySchema.js";
import { standardWriteLimiter, directoryReadLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("dirId", validateIdMiddleware);

router.post(
  "/delete-batch",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(75, 20, "dir-delete-batch"),
  validate(deleteDirectoryBatchSchema),
  deleteItemsBatch,
);

router.patch(
  ["/move", "/:dirId/move"],
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(50, 25, "dir-move"),
  validate(moveDirectorySchema),
  moveItems,
);

router.post(
  ["/copy", "/:dirId/copy"],
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(50, 25, "dir-copy"),
  validate(copyDirectorySchema),
  copyItems,
);

// High-speed directory fetching with zero artificial delay & 1,800 req/min limit
router.get(
  ["/", "/:dirId"],
  checkAuth,
  directoryReadLimiter,
  validate(getDirectoryByIdSchema),
  getDirectoryById,
);

router.post(
  ["/", "/:parentDirId"],
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(50, 30, "dir-create"),
  validate(createDirectorySchema),
  createDirectory,
);

router.patch(
  "/:dirId",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(50, 25, "dir-rename"),
  validate(renameDirectorySchema),
  renameDirectory,
);

router.delete(
  "/:dirId",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(50, 25, "dir-delete"),
  validate(deleteDirectorySchema),
  deleteDirectory,
);

export default router;
