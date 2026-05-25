import { z } from "zod";
import { objectIdSchema, optionalObjectIdSchema } from "./common.js";

export const searchSchema = {
  query: z.object({
    q: z.string().min(1, "Search query required"), // Strongly prevent {"$ne": null} injection
    parentId: optionalObjectIdSchema.optional(),
  }),
};

export const getThumbnailSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
};

export const getFileByIdSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
  query: z.object({
    action: z.string().optional(),
  }),
};

export const uploadFileSchema = {
  params: z.object({
    parentDirId: optionalObjectIdSchema.optional(),
  }),
  body: z.object({
    content: z.string().optional(),
  }).optional(),
};

export const renameFileSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
  body: z.object({
    newFileName: z.string().min(1, "New file name is required"),
  }),
};

export const saveFileSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
  body: z.object({
    content: z.string(),
  }),
};

export const deleteFileSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
};
