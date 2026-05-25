import { z } from "zod";
import { objectIdSchema } from "./common.js";

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

export const batchDeleteSchema = {
  body: z.object({
    items: z.array(
      z.object({
        id: objectIdSchema,
        type: z.string(),
      })
    ),
  }),
};
