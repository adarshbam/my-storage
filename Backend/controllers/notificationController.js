import {
  getUserNotificationsLogic,
  getUnreadCountLogic,
  markAsReadLogic,
  markAllAsReadLogic,
  dismissNotificationLogic,
  dismissAllNotificationsLogic,
  syncSecurityNotifications,
} from "../services/notification.service.js";

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    // Lazily sync security state notifications for the active user
    await syncSecurityNotifications(req.user).catch((err) => {
      console.warn("[NotificationController] Security sync warning:", err.message);
    });

    const result = await getUserNotificationsLogic({
      userId,
      type: req.query.type,
      severity: req.query.severity,
      unreadOnly: req.query.unreadOnly,
      includeDismissed: req.query.includeDismissed,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await getUnreadCountLogic({ userId });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await markAsReadLogic({
      userId,
      notificationId: req.params.id,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await markAllAsReadLogic({ userId });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const dismissNotification = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await dismissNotificationLogic({
      userId,
      notificationId: req.params.id,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const dismissAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const result = await dismissAllNotificationsLogic({ userId });
    return res.json(result);
  } catch (err) {
    next(err);
  }
};
