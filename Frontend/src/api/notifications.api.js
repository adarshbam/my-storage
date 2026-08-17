import apiClient from "../lib/apiClient";

/**
 * Fetch paginated notifications for current user with optional filters
 */
export async function getNotificationsApi({
  page = 1,
  limit = 20,
  type = null,
  severity = null,
  unreadOnly = false,
  includeDismissed = false,
} = {}) {
  const params = new URLSearchParams();
  if (page) params.append("page", String(page));
  if (limit) params.append("limit", String(limit));
  if (type) params.append("type", type);
  if (severity) params.append("severity", severity);
  if (unreadOnly) params.append("unreadOnly", "true");
  if (includeDismissed) params.append("includeDismissed", "true");

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiClient.get(`/notifications${query}`);
}

/**
 * Lightweight unread count query for navbar badge
 */
export async function getUnreadCountApi() {
  return apiClient.get("/notifications/unread-count");
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsReadApi(notificationId) {
  return apiClient.patch(`/notifications/${notificationId}/read`);
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsReadApi() {
  return apiClient.patch("/notifications/read-all");
}

/**
 * Dismiss a single notification from active list
 */
export async function dismissNotificationApi(notificationId) {
  return apiClient.patch(`/notifications/${notificationId}/dismiss`);
}

/**
 * Dismiss all active notifications
 */
export async function dismissAllNotificationsApi() {
  return apiClient.patch("/notifications/dismiss-all");
}
