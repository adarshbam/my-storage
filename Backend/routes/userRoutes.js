import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  getProfilePic,
  getSearchedItems,
  getUser,
  loginUser,
  logoutUser,
  authGoogle,
  logoutAllDevices,
  registerUser,
  storeSearchedItem,
  uploadProfilePic,
  authGithub,
  updateTheme,
  updateName,
  updatePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/userController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  authGoogleSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  storeSearchedItemSchema,
  updateThemeSchema,
  updateNameSchema,
  updatePasswordSchema,
  getProfilePicSchema,
} from "../validators/userSchema.js";
import {
  registerLimiter,
  loginLimiter,
  passwordResetLimiter,
  passwordUpdateLimiter,
} from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/", checkAuth, getUser);

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/auth/google", loginLimiter, validate(authGoogleSchema), authGoogle);
router.get("/auth/github", loginLimiter, authGithub);
router.post(
  "/auth/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/auth/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  resetPassword,
);

router.post("/logout", logoutUser);
router.post("/logout-all", checkAuth, logoutAllDevices);
router.post("/profilepic", checkAuth, uploadProfilePic);
router.get(
  "/profilepic",
  checkAuth,
  validate(getProfilePicSchema),
  getProfilePic,
);
router.get("/searchedItems", checkAuth, getSearchedItems);
router.post(
  "/searchedItems",
  checkAuth,
  validate(storeSearchedItemSchema),
  storeSearchedItem,
);
router.put("/theme", checkAuth, validate(updateThemeSchema), updateTheme);
router.patch("/name", checkAuth, validate(updateNameSchema), updateName);
router.post(
  "/password",
  checkAuth,
  passwordUpdateLimiter,
  validate(updatePasswordSchema),
  updatePassword,
);
router.patch(
  "/password",
  checkAuth,
  passwordUpdateLimiter,
  validate(updatePasswordSchema),
  updatePassword,
);

export default router;
