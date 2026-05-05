import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  listRepositories,
  getRepositoryContents,
  getFiles,
  downloadRepository,
  updateFiles,
  deleteFile,
  createFile,
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

// create file
router.post("/file/:githubPath", checkAuth, createFile);

// edit file
router.put("/file/:githubPath", checkAuth, updateFiles);

// delete file
router.delete("/file/:githubPath", checkAuth, deleteFile);

// download repo
router.get("/repositories/:githubPath/download", checkAuth, downloadRepository);

export default router;
