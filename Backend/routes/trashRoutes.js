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
import { heavyOpLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/", getTrashItems);
router.delete("/", heavyOpLimiter, emptyTrash);
router.post("/:id/restore", validate(restoreFileSchema), restoreFile);
router.delete("/:fileid", validate(deleteFileForeverSchema), deleteFileForever);
router.post("/directory/:dirId/restore", validate(restoreDirectorySchema), restoreDirectory);
router.delete("/directory/:dirId", validate(deleteDirectoryForeverSchema), deleteDirectoryForever);
router.post("/delete-batch", heavyOpLimiter, validate(batchDeleteSchema), batchDelete);

export default router;
