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
  searchRepository,
  moveGithubItems,
  getRepositoryDetails,
  disconnectGithub,
} from "../controllers/githubController.js";

const router = express.Router();

// list of all the repos
router.get("/repositories", checkAuth, listRepositories);

// disconnect github
router.post("/disconnect", checkAuth, disconnectGithub);

// get contents of a specific repo (root)
router.get("/repositories/:owner/:repo/contents", checkAuth, getRepositoryContents);
// get contents of a specific repo (subpath)
router.get("/repositories/:owner/:repo/contents/*path", checkAuth, getRepositoryContents);

// get repo details
router.get("/repositories/:owner/:repo", checkAuth, getRepositoryDetails);

// get files
router.get("/file/:owner/:repo/*path", checkAuth, getFiles);

// create file
router.post("/file/:owner/:repo/*path", checkAuth, createFile);

// edit file
router.put("/file/:owner/:repo/*path", checkAuth, updateFiles);

// delete file
router.delete("/file/:owner/:repo/*path", checkAuth, deleteFile);

// delete folder
router.delete("/repositories/:owner/:repo/*path", checkAuth, deleteFolder);

// download repo
router.get("/repositories/:owner/:repo/download", checkAuth, downloadRepository);

// download folder
router.get("/repositories/:owner/:repo/folder-download/*path", checkAuth, downloadFolder);

// list branches
router.get("/repositories/:owner/:repo/branches", checkAuth, listBranches);

// search repository
router.get("/repositories/:owner/:repo/search", checkAuth, searchRepository);

// move items
router.post("/move", checkAuth, moveGithubItems);

export default router;
