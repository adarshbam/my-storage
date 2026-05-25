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
};

export const getFileFromDriveSchema = {
  params: z.object({
    fileId: z.string().min(1, "File ID required"),
  }),
  query: z.object({
    action: z.string().optional(),
  }),
};

export const deleteFromDriveSchema = {
  params: z.object({
    fileId: z.string().min(1, "File ID required"),
  }),
};

export const uploadFileToDriveSchema = {
  params: z.object({
    parentFolderId: z.string().min(1, "Parent folder ID required"),
  }),
};

export const updateDriveItemSchema = {
  params: z.object({
    fileId: z.string().min(1, "File ID required"),
  }),
  body: z.object({
    name: z.string().min(1, "Name is required"),
  }),
};

export const moveDriveItemsSchema = {
  body: z.object({
    items: z.array(z.string()),
    targetId: z.string(),
  }),
};

export const transferToVaultSchema = {
  body: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        mimeType: z.string(),
        size: z.union([z.string(), z.number()]).optional(),
      })
    ),
    targetFolderId: objectIdSchema,
  }),
};

export const transferFromVaultSchema = {
  body: z.object({
    items: z.array(
      z.object({
        id: objectIdSchema,
        name: z.string(),
        extension: z.string().optional(),
        size: z.number().optional(),
      })
    ),
    targetDriveFolderId: z.string(),
  }),
};

export const searchDriveFilesSchema = {
  query: z.object({
    q: z.string().min(1, "Search query required"),
  }),
};
