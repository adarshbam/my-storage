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
} from "../controllers/fileController.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("fileId", validateIdMiddleware);

// Search Endpoint - MUST BE BEFORE /:fileId
router.get("/search", checkAuth, search);

router.get("/:fileId/thumbnail", checkAuth, getThumbnail);

router.get("/:fileId", checkAuth, getFileById);

// Allow both root upload (no param) and param upload
// Note: router.param middleware will NOT run for "/"
router.post(["/", "/:parentDirId"], checkAuth, uploadFile);

router.patch("/:fileId", checkAuth, renameFile);

router.delete("/:fileId", checkAuth, deleteFile);

export default router;
