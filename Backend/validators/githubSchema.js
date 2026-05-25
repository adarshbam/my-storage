import { z } from "zod";

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
    // Wildercard route path will be validated if present
    "0": z.string().optional(),
    path: z.string().optional(),
  }),
};

export const getRepositoryDetailsSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
};

export const getFilesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": z.string().optional(),
    path: z.string().optional(),
  }),
  query: z.object({
    action: z.string().optional(),
    ref: z.string().optional(),
  }),
};

export const createFileSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": z.string().optional(),
    path: z.string().optional(),
  }),
  body: z.object({
    content: z.string().optional(),
  }).optional(),
};

export const updateFilesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": z.string().optional(),
    path: z.string().optional(),
  }),
  body: z.object({
    content: z.string(),
    sha: z.string().min(1),
  }),
};

export const deleteFileSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": z.string().optional(),
    path: z.string().optional(),
  }),
  body: z.object({
    sha: z.string().min(1),
  }),
};

export const deleteFolderSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": z.string().optional(),
    path: z.string().optional(),
  }),
  query: z.object({
    ref: z.string().optional(),
  }),
};

export const downloadRepositorySchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  query: z.object({
    ref: z.string().optional(),
  }),
};

export const downloadFolderSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    "0": z.string().optional(),
    path: z.string().optional(),
  }),
  query: z.object({
    ref: z.string().optional(),
  }),
};

export const listBranchesSchema = {
  params: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
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
