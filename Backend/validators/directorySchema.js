import { z } from "zod";
import { objectIdSchema, optionalObjectIdSchema } from "./common.js";

export const getDirectoryByIdSchema = {
  params: z.object({
    dirId: optionalObjectIdSchema.optional(),
  }),
  query: z.object({
    action: z.string().optional(),
  }),
};

export const createDirectorySchema = {
  params: z.object({
    parentDirId: optionalObjectIdSchema.optional(),
  }),
  body: z.object({
    foldername: z.string().optional(), // Prevent NoSQL injection of objects
  }),
};

export const renameDirectorySchema = {
  params: z.object({
    dirId: objectIdSchema,
  }),
  body: z.object({
    newDirName: z.string().min(1, "New folder name is required"),
  }),
};

export const deleteDirectorySchema = {
  params: z.object({
    dirId: objectIdSchema,
  }),
};

export const moveDirectorySchema = {
  params: z.object({
    dirId: optionalObjectIdSchema,
  }),
  body: z.array(
    z.object({
      id: objectIdSchema,
      type: z.string().optional(),
    })
  ),
};

export const copyDirectorySchema = moveDirectorySchema;
