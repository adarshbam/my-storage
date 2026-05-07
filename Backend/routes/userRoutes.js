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
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", checkAuth, getUser);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/auth/google", authGoogle);
router.get("/auth/github", authGithub);

router.post("/logout", logoutUser);
router.post("/logout-all", checkAuth, logoutAllDevices);
router.post("/profilepic", checkAuth, uploadProfilePic);
router.get("/profilepic", checkAuth, getProfilePic);
router.get("/searchedItems", checkAuth, getSearchedItems);
router.post("/searchedItems", checkAuth, storeSearchedItem);
router.put("/theme", checkAuth, updateTheme);

export default router;
