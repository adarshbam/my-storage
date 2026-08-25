import { z } from "zod";
import { objectIdSchema, optionalObjectIdSchema } from "./common.js";

export const restoreFileSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const deleteFileForeverSchema = {
  params: z.object({
    fileid: objectIdSchema,
  }),
};

export const restoreDirectorySchema = {
  params: z.object({
    dirId: objectIdSchema,
  }),
};

export const deleteDirectoryForeverSchema = {
  params: z.object({
    dirId: objectIdSchema,
  }),
};

const batchItemSchema = z
  .object({
    id: optionalObjectIdSchema.optional(),
    _id: optionalObjectIdSchema.optional(),
    type: z.string().optional(),
  })
  .refine((data) => data.id || data._id, {
    message: "Either id or _id is required",
  });

export const batchDeleteSchema = {
  body: z.union([
    z.object({
      items: z.array(batchItemSchema),
    }),
    z.array(batchItemSchema),
  ]),
};

export const batchRestoreSchema = {
  body: z.union([
    z.object({
      items: z.array(batchItemSchema).optional(),
      all: z.boolean().optional(),
    }),
    z.array(batchItemSchema),
  ]),
};
