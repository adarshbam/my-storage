import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  createDirectory,
  deleteDirectory,
  getDirectoryById,
  moveItems,
  renameDirectory,
  copyItems,
} from "../controllers/directoryController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  getDirectoryByIdSchema,
  createDirectorySchema,
  renameDirectorySchema,
  deleteDirectorySchema,
  moveDirectorySchema,
  copyDirectorySchema,
} from "../validators/directorySchema.js";
import { standardWriteLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("dirId", validateIdMiddleware);

router.get(["/", "/:dirId"], checkAuth, standardWriteLimiter, throttle(100, 15, "dir-get"), validate(getDirectoryByIdSchema), getDirectoryById);

router.post(["/", "/:parentDirId"], checkAuth, standardWriteLimiter, throttle(100, 15, "dir-create"), validate(createDirectorySchema), createDirectory);

router.patch("/:dirId", checkAuth, standardWriteLimiter, throttle(100, 15, "dir-rename"), validate(renameDirectorySchema), renameDirectory);

router.delete("/:dirId", checkAuth, standardWriteLimiter, throttle(100, 12, "dir-delete"), validate(deleteDirectorySchema), deleteDirectory);

router.patch("/:dirId/move", checkAuth, standardWriteLimiter, throttle(100, 12, "dir-move"), validate(moveDirectorySchema), moveItems);

router.post("/:dirId/copy", checkAuth, standardWriteLimiter, throttle(100, 12, "dir-copy"), validate(copyDirectorySchema), copyItems);

export default router;
