import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dismissAllNotifications,
} from "../controllers/notificationController.js";
import checkAuth from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  getNotificationsSchema,
  notificationIdParamSchema,
} from "../validators/notificationSchema.js";
import { lightReadLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

// 1. Get paginated notifications for current user
router.get(
  "/",
  checkAuth,
  lightReadLimiter,
  validate(getNotificationsSchema),
  getNotifications,
);

// 2. Fast unread count endpoint for navbar bell badge
router.get(
  "/unread-count",
  checkAuth,
  lightReadLimiter,
  getUnreadCount,
);

// 3. Mark single notification as read
router.patch(
  "/:id/read",
  checkAuth,
  validate(notificationIdParamSchema),
  markAsRead,
);

// 4. Mark all notifications as read
router.patch(
  "/read-all",
  checkAuth,
  markAllAsRead,
);

// 5. Dismiss single notification
router.patch(
  "/:id/dismiss",
  checkAuth,
  validate(notificationIdParamSchema),
  dismissNotification,
);

// 6. Dismiss all notifications
router.patch(
  "/dismiss-all",
  checkAuth,
  dismissAllNotifications,
);

export default router;
