import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import { listRepositories } from "../controllers/githubController.js";

const router = express.Router();

// list of all the repos
router.get("/repositories", checkAuth, listRepositories);

export default router;
