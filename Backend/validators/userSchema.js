import { z } from "zod";
import { optionalObjectIdSchema } from "./common.js";

export const authGoogleSchema = {
  body: z.object({
    credential: z.string().min(1, "Credential required"),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email("Please enter a valid email"),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(1, "New password is required"),
  }),
};

export const storeSearchedItemSchema = {
  body: z.object({
    searchItem: z.string().optional(), // Can be empty to clear history
  }),
};

export const updateThemeSchema = {
  body: z.object({
    theme: z.enum(["light", "dark"]),
  }),
};

export const updateNameSchema = {
  body: z.object({
    name: z.string().min(1, "Name is required"),
  }),
};

export const updatePasswordSchema = {
  body: z.object({
    currentPassword: z.string().optional(),
    password: z.string().min(1, "Password is required"),
  }),
};

export const getProfilePicSchema = {
  query: z.object({
    id: optionalObjectIdSchema.optional(),
  }),
};
