import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  createRepository,
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
import { validate } from "../middlewares/validationMiddleware.js";
import {
  createRepositorySchema,
  getRepositoryContentsSchema,
  getRepositoryDetailsSchema,
  getFilesSchema,
  createFileSchema,
  updateFilesSchema,
  deleteFileSchema,
  deleteFolderSchema,
  downloadRepositorySchema,
  downloadFolderSchema,
  listBranchesSchema,
  searchRepositorySchema,
  moveGithubItemsSchema,
} from "../validators/githubSchema.js";
import { heavyOpLimiter, mediumWriteLimiter, standardWriteLimiter, searchLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";

const router = express.Router();

// list of all the repos
router.get("/repositories", checkAuth, standardWriteLimiter, throttle(100, 15, "gh-repos"), listRepositories);
// create repo
router.post("/repositories", checkAuth, mediumWriteLimiter, throttle(300, 8, "gh-repo-create"), validate(createRepositorySchema), createRepository);

// disconnect github
router.post("/disconnect", checkAuth, mediumWriteLimiter, throttle(300, 5, "gh-disconnect"), disconnectGithub);

// get contents of a specific repo (root)
router.get("/repositories/:owner/:repo/contents", checkAuth, standardWriteLimiter, throttle(100, 15, "gh-contents"), validate(getRepositoryContentsSchema), getRepositoryContents);
// get contents of a specific repo (subpath)
router.get("/repositories/:owner/:repo/contents/*path", checkAuth, standardWriteLimiter, throttle(100, 15, "gh-contents"), validate(getRepositoryContentsSchema), getRepositoryContents);

// get repo details
router.get("/repositories/:owner/:repo", checkAuth, standardWriteLimiter, throttle(100, 15, "gh-repo-details"), validate(getRepositoryDetailsSchema), getRepositoryDetails);

// get files
router.get("/file/:owner/:repo/*path", checkAuth, standardWriteLimiter, throttle(100, 12, "gh-file-get"), validate(getFilesSchema), getFiles);

// create file
router.post("/file/:owner/:repo/*path", checkAuth, mediumWriteLimiter, throttle(300, 8, "gh-file-create"), validate(createFileSchema), createFile);

// edit file
router.put("/file/:owner/:repo/*path", checkAuth, mediumWriteLimiter, throttle(300, 8, "gh-file-update"), validate(updateFilesSchema), updateFiles);

// delete file
router.delete("/file/:owner/:repo/*path", checkAuth, mediumWriteLimiter, throttle(300, 8, "gh-file-delete"), validate(deleteFileSchema), deleteFile);

// delete folder
router.delete("/repositories/:owner/:repo/*path", checkAuth, mediumWriteLimiter, throttle(300, 8, "gh-folder-delete"), validate(deleteFolderSchema), deleteFolder);

// download repo
router.get("/repositories/:owner/:repo/download", checkAuth, heavyOpLimiter, throttle(5000, 1, "gh-repo-download"), validate(downloadRepositorySchema), downloadRepository);

// download folder
router.get("/repositories/:owner/:repo/folder-download/*path", checkAuth, heavyOpLimiter, throttle(5000, 1, "gh-folder-download"), validate(downloadFolderSchema), downloadFolder);

// list branches
router.get("/repositories/:owner/:repo/branches", checkAuth, standardWriteLimiter, throttle(100, 15, "gh-branches"), validate(listBranchesSchema), listBranches);

// search repository
router.get("/repositories/:owner/:repo/search", checkAuth, searchLimiter, throttle(200, 10, "gh-search"), validate(searchRepositorySchema), searchRepository);

// move items
router.post("/move", checkAuth, mediumWriteLimiter, throttle(300, 8, "gh-move"), validate(moveGithubItemsSchema), moveGithubItems);

export default router;
