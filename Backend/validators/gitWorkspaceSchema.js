import { z } from "zod";

export const cloneRepoSchema = {
  body: z.object({
    owner: z.string().min(1, "Owner is required"),
    repo: z.string().min(1, "Repo name is required"),
    branch: z.string().optional(),
    destinationFolderId: z.string().nullable().optional(),
    folderName: z.string().optional(),
  }),
};

export const getWorkspaceStatusSchema = {
  query: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
  }),
};

export const stageFilesSchema = {
  body: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    filePaths: z.array(z.string()).optional(),
    stageAll: z.boolean().optional(),
  }),
};

export const unstageFilesSchema = {
  body: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    filePaths: z.array(z.string()).optional(),
    unstageAll: z.boolean().optional(),
  }),
};

export const commitWorkspaceSchema = {
  body: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    message: z.string().min(1, "Commit message is required"),
    description: z.string().optional(),
  }),
};

export const pullRemoteChangesSchema = {
  body: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
  }),
};

export const switchWorkspaceBranchSchema = {
  body: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    targetBranch: z.string().min(1, "targetBranch is required"),
    createNew: z.boolean().optional(),
  }),
};

export const stashChangesSchema = {
  body: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    message: z.string().optional(),
  }),
};

export const listStashesSchema = {
  params: z.object({
    workspaceId: z.string().optional(),
  }),
  query: z.object({
    folderId: z.string().optional(),
  }).optional(),
};

export const popStashSchema = {
  params: z.object({
    stashId: z.string().min(1, "stashId is required"),
  }),
};

export const dropStashSchema = {
  params: z.object({
    stashId: z.string().min(1, "stashId is required"),
  }),
};

export const configureFolderBackupSchema = {
  body: z.object({
    directoryId: z.string().min(1, "directoryId is required"),
    repoOwner: z.string().min(1, "repoOwner is required"),
    repoName: z.string().min(1, "repoName is required"),
    targetBranch: z.string().optional(),
    frequency: z.enum(["manual", "on_change", "daily", "weekly"]).optional(),
  }),
};

export const runFolderBackupSyncSchema = {
  body: z.object({
    directoryId: z.string().min(1, "directoryId is required"),
    repoOwner: z.string().optional(),
    repoName: z.string().optional(),
    targetBranch: z.string().optional(),
  }),
};

export const getGitignoreSchema = {
  query: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
  }),
};

export const updateGitignoreSchema = {
  body: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    content: z.string(),
  }),
};

export const addIgnoreRuleSchema = {
  body: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
    pattern: z.string().min(1, "Pattern is required"),
  }),
};
