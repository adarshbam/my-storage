import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  listRepositories,
  getRepositoryContents,
  getFiles,
  downloadRepository
} from "../controllers/githubController.js";

const router = express.Router();

// list of all the repos
router.get("/repositories", checkAuth, listRepositories);

// get contents of a specific repo
router.get(
  "/repositories/:githubPath/contents",
  checkAuth,
  getRepositoryContents,
);

// get files
router.get("/file/:githubPath", checkAuth, getFiles);

// download repo
router.get("/repositories/:githubPath/download", checkAuth, downloadRepository);

export default router;
