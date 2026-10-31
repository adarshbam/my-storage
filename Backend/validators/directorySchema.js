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
  query: z.object({
    ownerId: z.string().optional(),
    permanent: z.string().optional(),
  }).optional(),
};

export const moveDirectorySchema = {
  params: z.object({
    dirId: optionalObjectIdSchema.optional(),
  }),
  body: z.array(
    z.object({
      _id: objectIdSchema,
      type: z.string().optional(),
    })
  ),
};

export const copyDirectorySchema = moveDirectorySchema;

export const deleteDirectoryBatchSchema = {
  body: z.array(
    z
      .object({
        _id: optionalObjectIdSchema.optional(),
        id: optionalObjectIdSchema.optional(),
        type: z.enum(["file", "directory"]),
      })
      .refine((data) => data._id || data.id, {
        message: "Either _id or id is required",
      })
  ),
  query: z
    .object({
      ownerId: z.string().optional(),
      permanent: z.string().optional(),
    })
    .optional(),
};

export const updateDirectoryPublicAccessSchema = {
  params: z.object({
    dirId: objectIdSchema,
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

export const getDirectoryPublicAccessSchema = {
  params: z.object({
    dirId: objectIdSchema,
  }),
};
