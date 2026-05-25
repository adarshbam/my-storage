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
import { validate } from "../middlewares/validationMiddleware.js";
import {
  getDirectoryByIdSchema,
  createDirectorySchema,
  renameDirectorySchema,
  deleteDirectorySchema,
  moveDirectorySchema,
} from "../validators/directorySchema.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("dirId", validateIdMiddleware);

router.get(["/", "/:dirId"], checkAuth, validate(getDirectoryByIdSchema), getDirectoryById);

router.post(["/", "/:parentDirId"], checkAuth, validate(createDirectorySchema), createDirectory);

router.patch("/:dirId", checkAuth, validate(renameDirectorySchema), renameDirectory);

router.delete("/:dirId", checkAuth, validate(deleteDirectorySchema), deleteDirectory);

router.patch("/:dirId/move", checkAuth, validate(moveDirectorySchema), moveDirectory);

export default router;
