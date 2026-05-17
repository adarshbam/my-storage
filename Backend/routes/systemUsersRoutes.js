import express from "express";
import {
  getAllSystemUsers,
  deleteSystemUser,
  forceLogoutUser,
  updateSystemUserRole,
  reactivateSystemUser,
} from "../controllers/systemUsersController.js";
import checkAuth from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", checkAuth, getAllSystemUsers);
router.delete("/:id", checkAuth, deleteSystemUser);
router.post("/:id/logout", checkAuth, forceLogoutUser);
router.patch("/:id/role", checkAuth, updateSystemUserRole);
router.post("/:id/reactivate", checkAuth, reactivateSystemUser);

export default router;
