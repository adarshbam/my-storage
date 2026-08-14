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
import { standardWriteLimiter } from "../middlewares/rateLimiter.js";
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
  throttle(100, 12, "dir-delete-batch"),
  validate(deleteDirectoryBatchSchema),
  deleteItemsBatch,
);

router.patch(
  ["/move", "/:dirId/move"],
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(100, 12, "dir-move"),
  validate(moveDirectorySchema),
  moveItems,
);

router.post(
  ["/copy", "/:dirId/copy"],
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(100, 12, "dir-copy"),
  validate(copyDirectorySchema),
  copyItems,
);

router.get(
  ["/", "/:dirId"],
  checkAuth,
  standardWriteLimiter,
  throttle(100, 15, "dir-get"),
  validate(getDirectoryByIdSchema),
  getDirectoryById,
);

router.post(
  ["/", "/:parentDirId"],
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(100, 15, "dir-create"),
  validate(createDirectorySchema),
  createDirectory,
);

router.patch(
  "/:dirId",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(100, 15, "dir-rename"),
  validate(renameDirectorySchema),
  renameDirectory,
);

router.delete(
  "/:dirId",
  checkAuth,
  loadPlanContext,
  requireRule("allowUpload"),
  standardWriteLimiter,
  throttle(100, 12, "dir-delete"),
  validate(deleteDirectorySchema),
  deleteDirectory,
);

export default router;
