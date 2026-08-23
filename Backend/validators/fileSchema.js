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

export const getThumbnailCdnUrlSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
  query: z.object({
    ownerId: optionalObjectIdSchema.optional(),
  }).optional(),
};

export const getFileByIdSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
  query: z.object({
    action: z.string().optional(),
  }),
};

export const getCdnUrlSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
  query: z.object({
    action: z.string().optional(),
    ownerId: optionalObjectIdSchema.optional(),
  }).optional(),
};

export const uploadFileSchema = {
  params: z.object({
    parentDirId: optionalObjectIdSchema.optional(),
  }),
  body: z.object({
    content: z.string().optional(),
  }).optional(),
};

export const uploadVaultInitiateSchema = {
  body: z.object({
    name: z.string().min(1, "Name is required"),
    size: z.number().optional(),
    contentType: z.string().optional(),
    parentDirId: z.string().nullable().optional(),
  }),
};

export const uploadVaultMultipartInitiateSchema = {
  body: z.object({
    name: z.string().min(1, "Name is required"),
    size: z.number().min(1, "File size must be greater than 0"),
    contentType: z.string().optional(),
    parentDirId: z.string().nullable().optional(),
  }),
};

export const uploadVaultMultipartPartUrlSchema = {
  body: z.object({
    fileId: objectIdSchema,
    uploadId: z.string().min(1, "uploadId is required"),
    partNumber: z.number().int().positive("partNumber must be positive"),
    key: z.string().min(1, "key is required"),
  }),
};

export const uploadVaultMultipartCompleteSchema = {
  body: z.object({
    fileId: objectIdSchema,
    uploadId: z.string().min(1, "uploadId is required"),
    key: z.string().min(1, "key is required"),
    parts: z.array(
      z.object({
        ETag: z.string().min(1, "ETag is required"),
        PartNumber: z.number().int().positive("PartNumber must be positive"),
      })
    ).min(1, "At least one part is required"),
  }),
};

export const uploadVaultCompleteSchema = {
  body: z.object({
    fileId: objectIdSchema,
    key: z.string().optional(),
  }),
};

export const uploadVaultAbortSchema = {
  body: z.object({
    fileId: objectIdSchema,
    key: z.string().optional(),
  }),
};

export const uploadVaultMultipartAbortSchema = {
  body: z.object({
    fileId: objectIdSchema,
    uploadId: z.string().optional().nullable(),
    key: z.string().optional().nullable(),
  }),
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
  query: z.object({
    ownerId: z.string().optional(),
    permanent: z.string().optional(),
  }).optional(),
};

export const markFileOpenedSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
};

