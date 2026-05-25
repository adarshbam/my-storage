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

const router = express.Router();

router.get("/", checkAuth, getUser);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/google", validate(authGoogleSchema), authGoogle);
router.get("/auth/github", authGithub);
router.post("/auth/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/auth/reset-password", validate(resetPasswordSchema), resetPassword);

router.post("/logout", logoutUser);
router.post("/logout-all", checkAuth, logoutAllDevices);
router.post("/profilepic", checkAuth, uploadProfilePic);
router.get("/profilepic", checkAuth, validate(getProfilePicSchema), getProfilePic);
router.get("/searchedItems", checkAuth, getSearchedItems);
router.post("/searchedItems", checkAuth, validate(storeSearchedItemSchema), storeSearchedItem);
router.put("/theme", checkAuth, validate(updateThemeSchema), updateTheme);
router.patch("/name", checkAuth, validate(updateNameSchema), updateName);
router.post("/password", checkAuth, validate(updatePasswordSchema), updatePassword);
router.patch("/password", checkAuth, validate(updatePasswordSchema), updatePassword);

export default router;
