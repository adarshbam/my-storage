import { z } from "zod";
import { objectIdSchema } from "./common.js";

const wildcardPathSchema = z.union([z.string(), z.array(z.string())]).optional();

export const createRepositorySchema = {
  body: z.object({
    name: z.string().min(1, "Name required"),
    description: z.string().optional(),
    private: z.boolean().optional(),
  }),
};

export const deleteRepositorySchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const getRepositoryContentsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": wildcardPathSchema,
    path: wildcardPathSchema,
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const getRepositoryDetailsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const getFilesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": wildcardPathSchema,
    path: wildcardPathSchema,
  }),
  query: z.object({
    action: z.string().optional(),
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const createFileSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": wildcardPathSchema,
    path: wildcardPathSchema,
  }),
  body: z.object({
    content: z.string().optional(),
    message: z.string().optional(),
    branch: z.string().optional(),
  }).optional(),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const updateFilesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": wildcardPathSchema,
    path: wildcardPathSchema,
  }),
  body: z.object({
    content: z.string(),
    sha: z.string().min(1),
    message: z.string().optional(),
    branch: z.string().optional(),
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const deleteFileSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": wildcardPathSchema,
    path: wildcardPathSchema,
  }),
  body: z.object({
    sha: z.string().min(1),
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const deleteFolderSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": wildcardPathSchema,
    path: wildcardPathSchema,
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const downloadRepositorySchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const downloadFolderSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": wildcardPathSchema,
    path: wildcardPathSchema,
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

/* --- Branches --- */

export const listBranchesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const createBranchSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  body: z.object({
    branchName: z.string().min(1, "Branch name required"),
    fromRef: z.string().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const deleteBranchSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    branch: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const compareBranchesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    base: z.string().min(1, "Base ref required"),
    head: z.string().min(1, "Head ref required"),
    ownerId: z.string().optional(),
  }),
};

/* --- Commits & History --- */

export const listCommitsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ref: z.string().optional(),
    path: z.string().optional(),
    per_page: z.string().optional(),
    page: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const getCommitDetailsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    sha: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const getFileHistorySchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": wildcardPathSchema,
    path: wildcardPathSchema,
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const getBlobSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    sha: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

/* --- Git Operations --- */

export const restoreFileSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  body: z.object({
    path: z.string().min(1, "Path required"),
    commitSha: z.string().min(1, "Commit SHA required"),
    branch: z.string().optional(),
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const revertCommitSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  body: z.object({
    commitSha: z.string().min(1, "Commit SHA required"),
    branch: z.string().optional(),
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const resetBranchSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  body: z.object({
    branch: z.string().min(1, "Branch name required"),
    targetSha: z.string().min(1, "Target commit SHA required"),
    mode: z.enum(["soft", "mixed", "hard"]).optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const cherryPickSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  body: z.object({
    commitSha: z.string().min(1, "Commit SHA required"),
    branch: z.string().min(1, "Branch name required"),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const mergeBranchSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  body: z.object({
    base: z.string().min(1, "Base branch required"),
    head: z.string().min(1, "Head branch required"),
    commitMessage: z.string().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

/* --- Pull Requests --- */

export const listPullRequestsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    state: z.string().optional(),
    per_page: z.string().optional(),
    page: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const createPullRequestSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  body: z.object({
    title: z.string().min(1, "Title required"),
    body: z.string().optional(),
    head: z.string().min(1, "Head branch required"),
    base: z.string().min(1, "Base branch required"),
    draft: z.boolean().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const getPullRequestDetailsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    pull_number: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const mergePullRequestSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    pull_number: z.string().min(1),
  }),
  body: z.object({
    mergeMethod: z.enum(["merge", "squash", "rebase"]).optional(),
    commitTitle: z.string().optional(),
    commitMessage: z.string().optional(),
  }).optional(),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const updatePullRequestSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    pull_number: z.string().min(1),
  }),
  body: z.object({
    state: z.enum(["open", "closed"]).optional(),
    title: z.string().optional(),
    body: z.string().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const listPRReviewsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    pull_number: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const submitPRReviewSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    pull_number: z.string().min(1),
  }),
  body: z.object({
    event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
    body: z.string().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const listPRCommentsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    pull_number: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const createPRCommentSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    pull_number: z.string().min(1),
  }),
  body: z.object({
    body: z.string().min(1, "Comment body required"),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

/* --- Search & Vault Transfer --- */

export const searchRepositorySchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    q: z.string().optional(),
    ref: z.string().optional(),
    path: z.string().optional(),
    ownerId: z.string().optional(),
  }),
};

export const moveGithubItemsSchema = {
  body: z.object({
    items: z.array(
      z.object({
        type: z.string(),
        name: z.string(),
        githubPath: z.string(),
      })
    ),
    targetPath: z.string(),
  }),
};

export const transferGithubFromVaultSchema = {
  body: z.object({
    items: z.array(
      z.object({
        _id: objectIdSchema,
        name: z.string(),
        type: z.string().optional(),
        extension: z.string().optional(),
        size: z.number().optional(),
      })
    ),
    targetPath: z.string().min(1, "Target GitHub path required"),
  }),
};

export const renameGithubItemSchema = {
  params: z.object({
    owner: z.string().min(1, "Owner required"),
    repo: z.string().min(1, "Repo required"),
  }),
  body: z.object({
    oldPath: z.string().min(1, "Old path required"),
    newPath: z.string().min(1, "New path required"),
    branch: z.string().optional(),
  }),
  query: z.object({
    ref: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

/* --- Releases & Release Assets (Feature 9) --- */

export const listReleasesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const createReleaseSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  body: z.object({
    tagName: z.string().min(1, "Tag name required"),
    name: z.string().optional(),
    body: z.string().optional(),
    draft: z.boolean().optional(),
    prerelease: z.boolean().optional(),
    targetCommitish: z.string().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const deleteReleaseSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    releaseId: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const uploadReleaseAssetSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    releaseId: z.string().min(1),
  }),
  body: z.object({
    fileId: objectIdSchema,
    customName: z.string().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const downloadReleaseAssetSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    assetId: z.string().min(1),
  }),
  body: z.object({
    assetName: z.string().optional(),
    destinationFolderId: z.string().nullable().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

/* --- Actions CI/CD (Feature 10) --- */

export const listWorkflowsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const listWorkflowRunsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    workflowId: z.string().optional(),
    per_page: z.string().optional(),
    page: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const dispatchWorkflowSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    workflowId: z.string().min(1),
  }),
  body: z.object({
    ref: z.string().optional(),
    inputs: z.record(z.any()).optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const listWorkflowArtifactsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    runId: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const importWorkflowArtifactSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    artifactId: z.string().min(1),
  }),
  body: z.object({
    artifactName: z.string().optional(),
    destinationFolderId: z.string().nullable().optional(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

