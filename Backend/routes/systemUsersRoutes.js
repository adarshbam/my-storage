import express from "express";
import {
  getAllSystemUsers,
  deleteSystemUser,
  forceLogoutUser,
  updateSystemUserRole,
  reactivateSystemUser,
} from "../controllers/systemUsersController.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  deleteSystemUserSchema,
  forceLogoutUserSchema,
  updateSystemUserRoleSchema,
  reactivateSystemUserSchema,
} from "../validators/systemUserSchema.js";

const router = express.Router();

router.get("/", checkAuth, getAllSystemUsers);
router.delete("/:id", checkAuth, validate(deleteSystemUserSchema), deleteSystemUser);
router.post("/:id/logout", checkAuth, validate(forceLogoutUserSchema), forceLogoutUser);
router.patch("/:id/role", checkAuth, validate(updateSystemUserRoleSchema), updateSystemUserRole);
router.post("/:id/reactivate", checkAuth, validate(reactivateSystemUserSchema), reactivateSystemUser);

export default router;
