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
import { adminLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.get("/", checkAuth, adminLimiter, throttle(200, 10, "admin-list"), getAllSystemUsers);
router.delete("/:id", checkAuth, adminLimiter, throttle(200, 10, "admin-delete"), validate(deleteSystemUserSchema), deleteSystemUser);
router.post("/:id/logout", checkAuth, adminLimiter, throttle(200, 10, "admin-logout"), validate(forceLogoutUserSchema), forceLogoutUser);
router.patch("/:id/role", checkAuth, adminLimiter, throttle(200, 10, "admin-role"), validate(updateSystemUserRoleSchema), updateSystemUserRole);
router.post("/:id/reactivate", checkAuth, adminLimiter, throttle(200, 10, "admin-reactivate"), validate(reactivateSystemUserSchema), reactivateSystemUser);

export default router;
