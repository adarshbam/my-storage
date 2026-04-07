import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  getProfilePic,
  getSearchedItems,
  getUser,
  loginUser,
  logoutUser,
  registerUser,
  storeSearchedItem,
  uploadProfilePic,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", checkAuth, getUser);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/profilepic", checkAuth, uploadProfilePic);
router.get("/profilepic", checkAuth, getProfilePic);
router.get("/searchedItems", checkAuth, getSearchedItems);
router.post("/searchedItems", checkAuth, storeSearchedItem);

export default router;
