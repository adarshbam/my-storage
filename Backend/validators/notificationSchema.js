import { z } from "zod";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_SEVERITIES,
} from "../constants/notification.constants.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const getNotificationsSchema = {
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) =>
        val ? Math.min(100, Math.max(1, parseInt(val, 10) || 20)) : 20,
      ),
    type: z
      .enum(Object.values(NOTIFICATION_TYPES))
      .optional(),
    severity: z
      .enum(Object.values(NOTIFICATION_SEVERITIES))
      .optional(),
    unreadOnly: z
      .string()
      .optional()
      .transform((val) => val === "true"),
    includeDismissed: z
      .string()
      .optional()
      .transform((val) => val === "true"),
  }),
};

export const notificationIdParamSchema = {
  params: z.object({
    id: z
      .string()
      .regex(objectIdRegex, { message: "Invalid notification ID format" }),
  }),
};
