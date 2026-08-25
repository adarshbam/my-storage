import { z } from "zod";
import { objectIdSchema } from "./common.js";

export const connectGoogleDriveSchema = {
  body: z.object({
    code: z.string().min(1, "OAuth code required"),
  }),
};

export const listDriveFolderSchema = {
  params: z.object({
    folderId: z.string().min(1, "Folder ID required"),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const getFileFromDriveSchema = {
  params: z.object({
    fileId: z.string().min(1, "File ID required"),
  }),
  query: z.object({
    action: z.string().optional(),
    ownerId: z.string().optional(),
  }).optional(),
};

export const deleteFromDriveSchema = {
  params: z.object({
    fileId: z.string().min(1, "File ID required"),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const uploadFileToDriveSchema = {
  params: z.object({
    parentFolderId: z.string().min(1, "Parent folder ID required"),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const updateDriveItemSchema = {
  params: z.object({
    fileId: z.string().min(1, "File ID required"),
  }),
  body: z.object({
    name: z.string().min(1, "Name is required"),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const moveDriveItemsSchema = {
  body: z.object({
    items: z.array(z.string()),
    targetId: z.string(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const transferToVaultSchema = {
  body: z.object({
    items: z.array(
      z.object({
        _id: z.string().min(1),
        name: z.string(),
        mimeType: z.string().optional(),
        type: z.string().optional(),
        size: z.union([z.string(), z.number()]).optional(),
      })
    ),
    targetFolderId: objectIdSchema,
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const transferFromVaultSchema = {
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
    targetDriveFolderId: z.string(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};

export const searchDriveFilesSchema = {
  query: z.object({
    q: z.string().min(1, "Search query required"),
    ownerId: z.string().optional(),
  }),
};

export const saveDriveFileSchema = {
  params: z.object({
    fileId: z.string().min(1, "File ID required"),
  }),
  body: z.object({
    content: z.string(),
  }),
  query: z.object({
    ownerId: z.string().optional(),
  }).optional(),
};
