import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  createRepository,
  deleteRepository,
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
  createBranch,
  deleteBranch,
  compareBranches,
  listCommits,
  getCommitDetails,
  getFileHistory,
  getBlob,
  restoreFile,
  revertCommit,
  resetBranch,
  cherryPickCommit,
  mergeBranch,
  listPullRequests,
  createPullRequest,
  getPullRequestDetails,
  mergePullRequest,
  updatePullRequest,
  listPRReviews,
  submitPRReview,
  listPRComments,
  createPRComment,
  searchRepository,
  moveGithubItems,
  getRepositoryDetails,
  disconnectGithub,
  transferFromVault,
} from "../controllers/githubController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  createRepositorySchema,
  deleteRepositorySchema,
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
  createBranchSchema,
  deleteBranchSchema,
  compareBranchesSchema,
  listCommitsSchema,
  getCommitDetailsSchema,
  getFileHistorySchema,
  getBlobSchema,
  restoreFileSchema,
  revertCommitSchema,
  resetBranchSchema,
  cherryPickSchema,
  mergeBranchSchema,
  listPullRequestsSchema,
  createPullRequestSchema,
  getPullRequestDetailsSchema,
  mergePullRequestSchema,
  updatePullRequestSchema,
  listPRReviewsSchema,
  submitPRReviewSchema,
  listPRCommentsSchema,
  createPRCommentSchema,
  searchRepositorySchema,
  moveGithubItemsSchema,
  transferGithubFromVaultSchema,
} from "../validators/githubSchema.js";
import {
  heavyOpLimiter,
  mediumWriteLimiter,
  standardWriteLimiter,
  directoryReadLimiter,
  searchLimiter,
} from "../middlewares/rateLimiter.js";
import throttle from "../utils/throttle.js";
import { loadPlanContext } from "../middlewares/loadPlanContext.js";
import { requireFeature } from "../middlewares/requireFeature.js";

const router = express.Router();

// Require authenticated session and github_backup feature for all GitHub routes
router.use(checkAuth, loadPlanContext, requireFeature("github_backup"));

// ==========================================
// REPOSITORY MANAGEMENT
// ==========================================

// list of all the repos
router.get(
  "/repositories",
  directoryReadLimiter,
  listRepositories,
);

// create repo
router.post(
  "/repositories",
  mediumWriteLimiter,
  throttle(300, 8, "gh-repo-create"),
  validate(createRepositorySchema),
  createRepository,
);

// disconnect github
router.post(
  "/disconnect",
  mediumWriteLimiter,
  throttle(300, 5, "gh-disconnect"),
  disconnectGithub,
);

// transfer from vault
router.post(
  "/transfer-from-vault",
  mediumWriteLimiter,
  throttle(500, 6, "gh-transfer-from"),
  validate(transferGithubFromVaultSchema),
  transferFromVault,
);

// move items
router.post(
  "/move",
  mediumWriteLimiter,
  throttle(300, 8, "gh-move"),
  validate(moveGithubItemsSchema),
  moveGithubItems,
);

// ==========================================
// BRANCHES & COMPARISON
// ==========================================

// list branches
router.get(
  "/repositories/:owner/:repo/branches",
  directoryReadLimiter,
  throttle(100, 20, "gh-branches"),
  validate(listBranchesSchema),
  listBranches,
);

// create branch
router.post(
  "/repositories/:owner/:repo/branches",
  mediumWriteLimiter,
  throttle(200, 10, "gh-branch-create"),
  validate(createBranchSchema),
  createBranch,
);

// delete branch
router.delete(
  "/repositories/:owner/:repo/branches/:branch",
  mediumWriteLimiter,
  throttle(300, 8, "gh-branch-delete"),
  validate(deleteBranchSchema),
  deleteBranch,
);

// compare branches / commits
router.get(
  "/repositories/:owner/:repo/compare",
  directoryReadLimiter,
  validate(compareBranchesSchema),
  compareBranches,
);

// ==========================================
// COMMITS & HISTORY
// ==========================================

// list commits
router.get(
  "/repositories/:owner/:repo/commits",
  directoryReadLimiter,
  throttle(100, 30, "gh-commits"),
  validate(listCommitsSchema),
  listCommits,
);

// get commit details
router.get(
  "/repositories/:owner/:repo/commits/:sha",
  directoryReadLimiter,
  validate(getCommitDetailsSchema),
  getCommitDetails,
);

// get file commit history
router.get(
  "/repositories/:owner/:repo/file-history/*path",
  directoryReadLimiter,
  validate(getFileHistorySchema),
  getFileHistory,
);

// get blob by sha
router.get(
  "/repositories/:owner/:repo/blob/:sha",
  directoryReadLimiter,
  validate(getBlobSchema),
  getBlob,
);

// ==========================================
// GIT OPERATIONS (RESTORE, REVERT, RESET, CHERRY-PICK, MERGE)
// ==========================================

// restore file from commit
router.post(
  "/repositories/:owner/:repo/git/restore",
  mediumWriteLimiter,
  throttle(300, 8, "gh-git-restore"),
  validate(restoreFileSchema),
  restoreFile,
);

// revert commit
router.post(
  "/repositories/:owner/:repo/git/revert",
  mediumWriteLimiter,
  throttle(300, 8, "gh-git-revert"),
  validate(revertCommitSchema),
  revertCommit,
);

// reset branch
router.post(
  "/repositories/:owner/:repo/git/reset",
  mediumWriteLimiter,
  throttle(500, 5, "gh-git-reset"),
  validate(resetBranchSchema),
  resetBranch,
);

// cherry-pick commit
router.post(
  "/repositories/:owner/:repo/git/cherry-pick",
  mediumWriteLimiter,
  throttle(300, 8, "gh-git-cherry-pick"),
  validate(cherryPickSchema),
  cherryPickCommit,
);

// merge branches
router.post(
  "/repositories/:owner/:repo/git/merge",
  mediumWriteLimiter,
  throttle(300, 8, "gh-git-merge"),
  validate(mergeBranchSchema),
  mergeBranch,
);

// ==========================================
// PULL REQUESTS
// ==========================================

// list PRs
router.get(
  "/repositories/:owner/:repo/pulls",
  directoryReadLimiter,
  throttle(100, 20, "gh-prs-list"),
  validate(listPullRequestsSchema),
  listPullRequests,
);

// create PR
router.post(
  "/repositories/:owner/:repo/pulls",
  mediumWriteLimiter,
  throttle(300, 8, "gh-pr-create"),
  validate(createPullRequestSchema),
  createPullRequest,
);

// get PR details
router.get(
  "/repositories/:owner/:repo/pulls/:pull_number",
  directoryReadLimiter,
  validate(getPullRequestDetailsSchema),
  getPullRequestDetails,
);

// merge PR
router.put(
  "/repositories/:owner/:repo/pulls/:pull_number/merge",
  mediumWriteLimiter,
  throttle(500, 6, "gh-pr-merge"),
  validate(mergePullRequestSchema),
  mergePullRequest,
);

// update PR (close, reopen, title, body)
router.patch(
  "/repositories/:owner/:repo/pulls/:pull_number",
  mediumWriteLimiter,
  validate(updatePullRequestSchema),
  updatePullRequest,
);

// list PR reviews
router.get(
  "/repositories/:owner/:repo/pulls/:pull_number/reviews",
  directoryReadLimiter,
  validate(listPRReviewsSchema),
  listPRReviews,
);

// submit PR review
router.post(
  "/repositories/:owner/:repo/pulls/:pull_number/reviews",
  mediumWriteLimiter,
  throttle(300, 8, "gh-pr-review"),
  validate(submitPRReviewSchema),
  submitPRReview,
);

// list PR comments
router.get(
  "/repositories/:owner/:repo/pulls/:pull_number/comments",
  directoryReadLimiter,
  validate(listPRCommentsSchema),
  listPRComments,
);

// create PR comment
router.post(
  "/repositories/:owner/:repo/pulls/:pull_number/comments",
  mediumWriteLimiter,
  throttle(200, 10, "gh-pr-comment"),
  validate(createPRCommentSchema),
  createPRComment,
);

// ==========================================
// SEARCH & CONTENTS
// ==========================================

// search repository (recursive tree search)
router.get(
  "/repositories/:owner/:repo/search",
  searchLimiter,
  throttle(100, 20, "gh-search"),
  validate(searchRepositorySchema),
  searchRepository,
);

// get contents of a specific repo (root)
router.get(
  "/repositories/:owner/:repo/contents",
  directoryReadLimiter,
  validate(getRepositoryContentsSchema),
  getRepositoryContents,
);

// get contents of a specific repo (subpath)
router.get(
  "/repositories/:owner/:repo/contents/*path",
  directoryReadLimiter,
  validate(getRepositoryContentsSchema),
  getRepositoryContents,
);

// download repo
router.get(
  "/repositories/:owner/:repo/download",
  heavyOpLimiter,
  throttle(5000, 1, "gh-repo-download"),
  validate(downloadRepositorySchema),
  downloadRepository,
);

// download folder
router.get(
  "/repositories/:owner/:repo/folder-download/*path",
  heavyOpLimiter,
  throttle(5000, 1, "gh-folder-download"),
  validate(downloadFolderSchema),
  downloadFolder,
);

// delete folder
router.delete(
  "/repositories/:owner/:repo/*path",
  mediumWriteLimiter,
  throttle(300, 8, "gh-folder-delete"),
  validate(deleteFolderSchema),
  deleteFolder,
);

// delete repository
router.delete(
  "/repositories/:owner/:repo",
  mediumWriteLimiter,
  throttle(1000, 3, "gh-repo-delete"),
  validate(deleteRepositorySchema),
  deleteRepository,
);

// get repo details
router.get(
  "/repositories/:owner/:repo",
  directoryReadLimiter,
  validate(getRepositoryDetailsSchema),
  getRepositoryDetails,
);

// get files
router.get(
  "/file/:owner/:repo/*path",
  directoryReadLimiter,
  validate(getFilesSchema),
  getFiles,
);

// create file
router.post(
  "/file/:owner/:repo/*path",
  mediumWriteLimiter,
  throttle(300, 8, "gh-file-create"),
  validate(createFileSchema),
  createFile,
);

// edit file
router.put(
  "/file/:owner/:repo/*path",
  mediumWriteLimiter,
  throttle(300, 8, "gh-file-update"),
  validate(updateFilesSchema),
  updateFiles,
);

// delete file
router.delete(
  "/file/:owner/:repo/*path",
  mediumWriteLimiter,
  throttle(300, 8, "gh-file-delete"),
  validate(deleteFileSchema),
  deleteFile,
);

export default router;
