import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  createDirectory,
  deleteDirectory,
  getDirectoryById,
  moveDirectory,
  renameDirectory,
} from "../controllers/directoryController.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("dirId", validateIdMiddleware);

router.get(["/", "/:dirId"], checkAuth, getDirectoryById);

router.post(["/", "/:parentDirId"], checkAuth, createDirectory);

router.patch("/:dirId", checkAuth, renameDirectory);

router.delete("/:dirId", checkAuth, deleteDirectory);

router.patch("/:dirId/move", checkAuth, moveDirectory);

export default router;
