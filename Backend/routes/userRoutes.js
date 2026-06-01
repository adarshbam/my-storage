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
  lightReadLimiter,
  profilePicLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

router.get("/", checkAuth, throttle(50, 20, "user-get"), getUser);

router.post("/register", registerLimiter, throttle(2000, 2, "register"), registerUser);
router.post("/login", loginLimiter, throttle(1500, 3, "login"), loginUser);
router.post(
  "/auth/google",
  loginLimiter,
  throttle(500, 5, "oauth-google"),
  validate(authGoogleSchema),
  authGoogle,
);
router.get("/auth/github", loginLimiter, throttle(500, 5, "oauth-github"), authGithub);
router.post(
  "/auth/forgot-password",
  passwordResetLimiter,
  throttle(2000, 2, "forgot-pwd"),
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  "/auth/reset-password",
  passwordResetLimiter,
  throttle(2000, 2, "reset-pwd"),
  validate(resetPasswordSchema),
  resetPassword,
);

router.post("/logout", throttle(100, 10, "logout"), logoutUser);
router.post("/logout-all", checkAuth, throttle(500, 3, "logout-all"), logoutAllDevices);
router.post("/profilepic", checkAuth, profilePicLimiter, throttle(1000, 3, "profilepic-upload"), uploadProfilePic);
router.get(
  "/profilepic",
  checkAuth,
  lightReadLimiter,
  throttle(50, 20, "profilepic-get"),
  validate(getProfilePicSchema),
  getProfilePic,
);
router.get("/searchedItems", checkAuth, lightReadLimiter, throttle(50, 20, "searched-get"), getSearchedItems);
router.post(
  "/searchedItems",
  checkAuth,
  lightReadLimiter,
  throttle(50, 20, "searched-store"),
  validate(storeSearchedItemSchema),
  storeSearchedItem,
);
router.put("/theme", checkAuth, lightReadLimiter, throttle(50, 20, "theme"), validate(updateThemeSchema), updateTheme);
router.patch("/name", checkAuth, lightReadLimiter, throttle(200, 10, "name"), validate(updateNameSchema), updateName);
router.post(
  "/password",
  checkAuth,
  passwordUpdateLimiter,
  throttle(2000, 2, "pwd-update"),
  validate(updatePasswordSchema),
  updatePassword,
);
router.patch(
  "/password",
  checkAuth,
  passwordUpdateLimiter,
  throttle(2000, 2, "pwd-update"),
  validate(updatePasswordSchema),
  updatePassword,
);

export default router;
