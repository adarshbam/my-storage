import * as githubService from "../services/github.service.js";

export const disconnectGithub = async (req, res, next) => {
  try {
    const result = await githubService.disconnectGithubLogic({
      userId: req.user.id,
      rootDirId: req.user.rootDirId,
      req,
      res,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to disconnect Github" });
    }
  }
};

export const createRepository = async (req, res, next) => {
  try {
    const result = await githubService.createRepositoryLogic({
      name: req.body.name,
      description: req.body.description,
      isPrivate: req.body.private,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to create repository" });
    }
  }
};

export const deleteRepository = async (req, res, next) => {
  try {
    const result = await githubService.deleteRepositoryLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to delete repository" });
    }
  }
};

export const listRepositories = async (req, res, next) => {
  try {
    const result = await githubService.listRepositoriesLogic({ req });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch repositories" });
    }
  }
};

export const getRepositoryContents = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.getRepositoryContentsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      ref: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch repository contents" });
    }
  }
};

export const getFiles = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    await githubService.getFilesLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      ref: req.query.ref,
      action: req.query.action,
      req,
      res,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch file" });
    }
  }
};

export const updateFiles = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.updateFilesLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      data: req.body,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to update file" });
    }
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.deleteFileLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      sha: req.body.sha,
      branch: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to delete file" });
    }
  }
};

export const createFile = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.createFileLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to create file" });
    }
  }
};

export const deleteFolder = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.deleteFolderLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      branch: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to delete folder recursively" });
    }
  }
};

export const downloadRepository = async (req, res, next) => {
  try {
    await githubService.downloadRepositoryLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      branch: req.query.ref,
      req,
      res,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Internal Server Error" });
    }
  }
};

export const downloadFolder = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    await githubService.downloadFolderLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      branch: req.query.ref,
      req,
      res,
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Folder download failed" });
    }
  }
};

/* ============================================================================
   BRANCH CONTROLLERS
   ============================================================================ */

export const listBranches = async (req, res, next) => {
  try {
    const result = await githubService.listBranchesLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch branches" });
    }
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const result = await githubService.createBranchLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      branchName: req.body.branchName,
      fromRef: req.body.fromRef,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to create branch" });
    }
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const result = await githubService.deleteBranchLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      branch: req.params.branch,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to delete branch" });
    }
  }
};

export const compareBranches = async (req, res, next) => {
  try {
    const base = req.query.base || req.params.base;
    const head = req.query.head || req.params.head;
    const result = await githubService.compareBranchesLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      base,
      head,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to compare branches" });
    }
  }
};

/* ============================================================================
   COMMITS & HISTORY CONTROLLERS
   ============================================================================ */

export const listCommits = async (req, res, next) => {
  try {
    const result = await githubService.listCommitsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      ref: req.query.ref,
      path: req.query.path,
      per_page: req.query.per_page ? parseInt(req.query.per_page, 10) : 30,
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch commits" });
    }
  }
};

export const getCommitDetails = async (req, res, next) => {
  try {
    const result = await githubService.getCommitDetailsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      sha: req.params.sha,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch commit details" });
    }
  }
};

export const getFileHistory = async (req, res, next) => {
  try {
    const pathSegment = req.params[0] || req.params.path;
    const path = Array.isArray(pathSegment) ? pathSegment.join("/") : pathSegment || "";

    const result = await githubService.getFileHistoryLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path,
      ref: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch file history" });
    }
  }
};

export const getBlob = async (req, res, next) => {
  try {
    const result = await githubService.getBlobLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      sha: req.params.sha,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch blob" });
    }
  }
};

/* ============================================================================
   GIT OPERATIONS: RESTORE, REVERT, RESET, CHERRY-PICK, MERGE
   ============================================================================ */

export const restoreFile = async (req, res, next) => {
  try {
    const result = await githubService.restoreFileLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      path: req.body.path,
      commitSha: req.body.commitSha,
      branch: req.body.branch || req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to restore file" });
    }
  }
};

export const revertCommit = async (req, res, next) => {
  try {
    const result = await githubService.revertCommitLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      commitSha: req.body.commitSha,
      branch: req.body.branch || req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to revert commit" });
    }
  }
};

export const resetBranch = async (req, res, next) => {
  try {
    const result = await githubService.resetBranchLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      branch: req.body.branch,
      targetSha: req.body.targetSha,
      mode: req.body.mode || "mixed",
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to reset branch" });
    }
  }
};

export const cherryPickCommit = async (req, res, next) => {
  try {
    const result = await githubService.cherryPickLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      commitSha: req.body.commitSha,
      branch: req.body.branch,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to cherry-pick commit" });
    }
  }
};

export const mergeBranch = async (req, res, next) => {
  try {
    const result = await githubService.mergeBranchLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      base: req.body.base,
      head: req.body.head,
      commitMessage: req.body.commitMessage,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({
        error: error.message || "Failed to merge branch",
        conflict: !!error.conflict,
      });
    }
  }
};

/* ============================================================================
   PULL REQUESTS CONTROLLERS
   ============================================================================ */

export const listPullRequests = async (req, res, next) => {
  try {
    const result = await githubService.listPullRequestsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      state: req.query.state || "open",
      per_page: req.query.per_page ? parseInt(req.query.per_page, 10) : 30,
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch pull requests" });
    }
  }
};

export const createPullRequest = async (req, res, next) => {
  try {
    const result = await githubService.createPullRequestLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      title: req.body.title,
      body: req.body.body,
      head: req.body.head,
      base: req.body.base,
      draft: req.body.draft,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to create pull request" });
    }
  }
};

export const getPullRequestDetails = async (req, res, next) => {
  try {
    const result = await githubService.getPullRequestDetailsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      pullNumber: req.params.pull_number,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch pull request details" });
    }
  }
};

export const mergePullRequest = async (req, res, next) => {
  try {
    const result = await githubService.mergePullRequestLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      pullNumber: req.params.pull_number,
      mergeMethod: req.body.mergeMethod || "merge",
      commitTitle: req.body.commitTitle,
      commitMessage: req.body.commitMessage,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to merge pull request" });
    }
  }
};

export const updatePullRequest = async (req, res, next) => {
  try {
    const result = await githubService.updatePullRequestLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      pullNumber: req.params.pull_number,
      state: req.body.state,
      title: req.body.title,
      body: req.body.body,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to update pull request" });
    }
  }
};

export const listPRReviews = async (req, res, next) => {
  try {
    const result = await githubService.listPRReviewsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      pullNumber: req.params.pull_number,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch PR reviews" });
    }
  }
};

export const submitPRReview = async (req, res, next) => {
  try {
    const result = await githubService.submitPRReviewLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      pullNumber: req.params.pull_number,
      event: req.body.event,
      body: req.body.body,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to submit review" });
    }
  }
};

export const listPRComments = async (req, res, next) => {
  try {
    const result = await githubService.listPRCommentsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      pullNumber: req.params.pull_number,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch PR comments" });
    }
  }
};

export const createPRComment = async (req, res, next) => {
  try {
    const result = await githubService.createPRCommentLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      pullNumber: req.params.pull_number,
      body: req.body.body,
      req,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to create comment" });
    }
  }
};

export const searchRepository = async (req, res, next) => {
  try {
    const result = await githubService.searchRepositoryLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      query: req.query.q,
      ref: req.query.ref,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to search repository" });
    }
  }
};

export const getRepositoryDetails = async (req, res, next) => {
  try {
    const result = await githubService.getRepositoryDetailsLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to fetch repository details" });
    }
  }
};

export const moveGithubItems = async (req, res, next) => {
  try {
    const result = await githubService.moveGithubItemsLogic({
      items: req.body.items,
      targetPath: req.body.targetPath,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to move items" });
    }
  }
};

export const renameGithubItem = async (req, res, next) => {
  try {
    const result = await githubService.renameGithubItemLogic({
      owner: req.params.owner,
      repo: req.params.repo,
      oldPath: req.body.oldPath,
      newPath: req.body.newPath,
      branch: req.query.ref || req.body.branch,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to rename GitHub item" });
    }
  }
};

export const transferFromVault = async (req, res, next) => {
  try {
    const result = await githubService.transferFromVaultLogic({
      items: req.body.items,
      targetPath: req.body.targetPath,
      req,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({ error: error.message || "Failed to transfer to GitHub" });
    }
  }
};
