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

export const listBranchesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const searchRepositorySchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    q: z.string().min(1, "Search query required"),
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
