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
  deleteFolder,
  downloadFolder,
  listBranches,
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

// delete folder
router.delete("/repositories/:githubPath", checkAuth, deleteFolder);

// download repo
router.get("/repositories/:githubPath/download", checkAuth, downloadRepository);

// download folder
router.get(
  "/repositories/:githubPath/folder-download",
  checkAuth,
  downloadFolder,
);

// list branches
router.get("/repositories/:githubPath/branches", checkAuth, listBranches);

export default router;
