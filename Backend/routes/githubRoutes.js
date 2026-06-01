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
import { heavyOpLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// list of all the repos
router.get("/repositories", checkAuth, listRepositories);
// create repo
router.post("/repositories", checkAuth, validate(createRepositorySchema), createRepository);

// disconnect github
router.post("/disconnect", checkAuth, disconnectGithub);

// get contents of a specific repo (root)
router.get("/repositories/:owner/:repo/contents", checkAuth, validate(getRepositoryContentsSchema), getRepositoryContents);
// get contents of a specific repo (subpath)
router.get("/repositories/:owner/:repo/contents/*path", checkAuth, validate(getRepositoryContentsSchema), getRepositoryContents);

// get repo details
router.get("/repositories/:owner/:repo", checkAuth, validate(getRepositoryDetailsSchema), getRepositoryDetails);

// get files
router.get("/file/:owner/:repo/*path", checkAuth, validate(getFilesSchema), getFiles);

// create file
router.post("/file/:owner/:repo/*path", checkAuth, validate(createFileSchema), createFile);

// edit file
router.put("/file/:owner/:repo/*path", checkAuth, validate(updateFilesSchema), updateFiles);

// delete file
router.delete("/file/:owner/:repo/*path", checkAuth, validate(deleteFileSchema), deleteFile);

// delete folder
router.delete("/repositories/:owner/:repo/*path", checkAuth, validate(deleteFolderSchema), deleteFolder);

// download repo
router.get("/repositories/:owner/:repo/download", checkAuth, heavyOpLimiter, validate(downloadRepositorySchema), downloadRepository);

// download folder
router.get("/repositories/:owner/:repo/folder-download/*path", checkAuth, heavyOpLimiter, validate(downloadFolderSchema), downloadFolder);

// list branches
router.get("/repositories/:owner/:repo/branches", checkAuth, validate(listBranchesSchema), listBranches);

// search repository
router.get("/repositories/:owner/:repo/search", checkAuth, validate(searchRepositorySchema), searchRepository);

// move items
router.post("/move", checkAuth, validate(moveGithubItemsSchema), moveGithubItems);

export default router;
