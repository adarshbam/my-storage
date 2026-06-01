import express from "express";
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
import { heavyOpLimiter, standardWriteLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.get("/", standardWriteLimiter, throttle(100, 15, "trash-list"), getTrashItems);
router.delete("/", heavyOpLimiter, throttle(5000, 1, "trash-empty"), emptyTrash);
router.post("/:id/restore", standardWriteLimiter, throttle(200, 10, "trash-restore-file"), validate(restoreFileSchema), restoreFile);
router.delete("/:fileid", standardWriteLimiter, throttle(200, 10, "trash-delete-file"), validate(deleteFileForeverSchema), deleteFileForever);
router.post("/directory/:dirId/restore", standardWriteLimiter, throttle(200, 10, "trash-restore-dir"), validate(restoreDirectorySchema), restoreDirectory);
router.delete("/directory/:dirId", standardWriteLimiter, throttle(200, 10, "trash-delete-dir"), validate(deleteDirectoryForeverSchema), deleteDirectoryForever);
router.post("/delete-batch", heavyOpLimiter, throttle(5000, 1, "trash-batch-delete"), validate(batchDeleteSchema), batchDelete);

export default router;
