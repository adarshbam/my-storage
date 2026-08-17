import { z } from "zod";
import { objectIdSchema } from "./common.js";

export const generateShareLinkSchema = {
  body: z.object({
    expiresAt: z.string().or(z.null()).optional(),
    permission: z.array(z.string()).optional(),
    items: z
      .array(
        z.object({
          id: z.string(),
          type: z.enum(["file", "directory"]),
          provider: z.string().optional(),
          name: z.string().optional(),
        })
      )
      .optional(),
    password: z.string().optional().nullable(),
    hasPassword: z.boolean().optional(),
    accessType: z.enum(["restricted", "public"]).optional(),
    title: z.string().optional(),
    maxDownloads: z.number().optional().nullable(),
  }),
};

export const toggleShareLinkSchema = {
  params: z.object({
    linkId: objectIdSchema,
  }),
};

export const updateShareLinkSchema = {
  params: z.object({
    linkId: objectIdSchema,
  }),
  body: z.object({
    expiresAt: z.string().or(z.null()).optional(),
    permission: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    hasPassword: z.boolean().optional(),
    password: z.string().optional().nullable(),
    accessType: z.enum(["restricted", "public"]).optional(),
    title: z.string().optional(),
    maxDownloads: z.number().optional().nullable(),
  }),
};

export const revokeShareLinkSchema = {
  params: z.object({
    linkId: objectIdSchema,
  }),
};

export const getShareLinkByTokenSchema = {
  params: z.object({
    token: z.string().min(1, "Token required"),
  }),
  query: z.object({
    password: z.string().optional(),
  }).optional(),
};

export const verifyShareLinkPasswordSchema = {
  params: z.object({
    token: z.string().min(1, "Token required"),
  }),
  body: z.object({
    password: z.string().min(1, "Password required"),
  }),
};

export const downloadSharedFileSchema = {
  params: z.object({
    token: z.string().min(1, "Token required"),
    itemId: z.string().min(1, "Item ID required"),
  }),
};

export const claimShareAccessSchema = {
  params: z.object({
    token: z.string().min(1, "Token required"),
  }),
};
