import { z } from "zod";

export const cloneRepoSchema = z.object({
  body: z.object({
    owner: z.string().min(1, "Owner is required"),
    repo: z.string().min(1, "Repo name is required"),
    branch: z.string().optional(),
    destinationFolderId: z.string().nullable().optional(),
    folderName: z.string().optional(),
  }),
});

export const getWorkspaceStatusSchema = z.object({
  query: z.object({
    workspaceId: z.string().optional(),
    folderId: z.string().optional(),
  }),
});

export const stageFilesSchema = z.object({
  body: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
    filePaths: z.array(z.string()).optional(),
    stageAll: z.boolean().optional(),
  }),
});

export const unstageFilesSchema = z.object({
  body: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
    filePaths: z.array(z.string()).optional(),
    unstageAll: z.boolean().optional(),
  }),
});

export const commitWorkspaceSchema = z.object({
  body: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
    message: z.string().min(1, "Commit message is required"),
    description: z.string().optional(),
  }),
});

export const pullRemoteChangesSchema = z.object({
  body: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
  }),
});

export const switchWorkspaceBranchSchema = z.object({
  body: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
    targetBranch: z.string().min(1, "targetBranch is required"),
    createNew: z.boolean().optional(),
  }),
});

export const stashChangesSchema = z.object({
  body: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
    message: z.string().optional(),
  }),
});

export const listStashesSchema = z.object({
  params: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
  }),
});

export const popStashSchema = z.object({
  params: z.object({
    stashId: z.string().min(1, "stashId is required"),
  }),
});

export const dropStashSchema = z.object({
  params: z.object({
    stashId: z.string().min(1, "stashId is required"),
  }),
});

export const configureFolderBackupSchema = z.object({
  body: z.object({
    directoryId: z.string().min(1, "directoryId is required"),
    repoOwner: z.string().min(1, "repoOwner is required"),
    repoName: z.string().min(1, "repoName is required"),
    targetBranch: z.string().optional(),
    frequency: z.enum(["manual", "on_change", "daily", "weekly"]).optional(),
  }),
});

export const runFolderBackupSyncSchema = z.object({
  body: z.object({
    directoryId: z.string().min(1, "directoryId is required"),
    repoOwner: z.string().optional(),
    repoName: z.string().optional(),
    targetBranch: z.string().optional(),
  }),
});
