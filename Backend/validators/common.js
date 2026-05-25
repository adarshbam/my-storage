import { z } from "zod";

// A standard MongoDB ObjectId is a 24-character hexadecimal string.
// We also allow "undefined" and "null" as string literals since the client/controllers sometimes pass/use them as defaults.
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

export const optionalObjectIdSchema = objectIdSchema
  .or(z.literal("undefined"))
  .or(z.literal("null"))
  .or(z.literal(""));
