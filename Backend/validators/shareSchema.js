import { z } from "zod";
import { objectIdSchema } from "./common.js";

export const generateShareLinkSchema = {
  body: z.object({
    expiresAt: z.string().datetime().or(z.string().nullable()).optional(),
    permission: z.array(z.string()).optional(),
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
};

export const claimShareAccessSchema = {
  params: z.object({
    token: z.string().min(1, "Token required"),
  }),
};
