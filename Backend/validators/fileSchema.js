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
    contentType: z.string().nullable().optional(),
    parentDirId: z.any().optional(),
  }),
};

export const uploadVaultMultipartInitiateSchema = {
  body: z.object({
    name: z.string().min(1, "Name is required"),
    size: z.number().min(1, "File size must be greater than 0"),
    contentType: z.string().nullable().optional(),
    parentDirId: z.any().optional(),
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

export const recordItemOpenedSchema = {
  body: z.object({
    itemId: z.string().min(1),
    provider: z.enum(["local", "google_drive", "github", "dropbox"]).default("local"),
    name: z.string().optional(),
    type: z.enum(["file", "directory"]).default("file"),
    size: z.number().optional(),
    mimeType: z.string().optional(),
    metaUrl: z.string().optional(),
    githubPath: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
};

export const updateFilePublicAccessSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
  body: z.object({
    enabled: z.boolean(),
    allowedOrigins: z.array(z.string().trim().max(150)).optional().default(["*"]),
    playerSettings: z
      .object({
        accentColor: z
          .string()
          .trim()
          .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
          .optional()
          .default("#00f0ff"),
        hideBranding: z.boolean().optional().default(false),
        customWatermark: z
          .object({
            url: z.string().optional().default(""),
            position: z
              .enum(["top-left", "top-right", "bottom-left", "bottom-right"])
              .optional()
              .default("top-right"),
            clickUrl: z.string().optional().default(""),
            opacity: z.number().min(0).max(1).optional().default(0.8),
          })
          .optional()
          .default({}),
        autoPlay: z.boolean().optional().default(false),
        loop: z.boolean().optional().default(false),
        muted: z.boolean().optional().default(false),
        controls: z.boolean().optional().default(true),
        aspectRatio: z.enum(["16:9", "9:16", "4:3", "1:1"]).optional().default("16:9"),
        borderRadius: z.string().optional().default("12px"),
      })
      .optional()
      .default({}),
  }),
};

export const getFilePublicAccessSchema = {
  params: z.object({
    fileId: objectIdSchema,
  }),
};
