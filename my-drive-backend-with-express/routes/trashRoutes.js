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

const router = express.Router();

router.get("/", getTrashItems);
router.delete("/", emptyTrash);
router.post("/:id/restore", restoreFile);
router.delete("/:fileid", deleteFileForever);
router.post("/directory/:dirId/restore", restoreDirectory);
router.delete("/directory/:dirId", deleteDirectoryForever);
router.post("/delete-batch", batchDelete);

export default router;
