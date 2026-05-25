import { z } from "zod";
import { objectIdSchema } from "./common.js";

export const deleteSystemUserSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    deleteType: z.enum(["soft", "hard"]),
  }),
};

export const forceLogoutUserSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

export const updateSystemUserRoleSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    role: z.enum(["User", "Manager", "Admin", "Owner"]),
    userId: objectIdSchema,
  }),
};

export const reactivateSystemUserSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};
