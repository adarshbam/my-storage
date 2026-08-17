import { useState, useEffect, useCallback, useRef } from "react";
import {
  getNotificationsApi,
  getUnreadCountApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  dismissNotificationApi,
  dismissAllNotificationsApi,
} from "../api/notifications.api";
import { useAuth } from "../context/AuthContext";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");

  const filterRef = useRef(filter);
  filterRef.current = filter;

  // 1. Fetch unread count for navbar badge
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await getUnreadCountApi();
      if (typeof res?.unreadCount === "number") {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.warn("[useNotifications] Failed to fetch unread count:", err.message);
    }
  }, [user]);

  // 2. Fetch paginated notifications based on active filter
  const fetchNotifications = useCallback(
    async (targetPage = 1, targetFilter = filterRef.current, append = false) => {
      if (!user) {
        setNotifications([]);
        return;
      }

      try {
        setLoading(true);
        const queryOptions = {
          page: targetPage,
          limit: 20,
        };

        if (targetFilter === "unread") {
          queryOptions.unreadOnly = true;
        } else if (targetFilter === "security") {
          queryOptions.type = "security";
        } else if (targetFilter === "subscription") {
          queryOptions.type = "subscription";
        } else if (targetFilter === "billing") {
          queryOptions.type = "billing";
        } else if (targetFilter === "storage") {
          queryOptions.type = "storage";
        }

        const res = await getNotificationsApi(queryOptions);
        const items = res?.data || [];
        const pagination = res?.pagination || {};

        if (append) {
          setNotifications((prev) => [...prev, ...items]);
        } else {
          setNotifications(items);
        }

        setPage(pagination.page || targetPage);
        setHasMore(!!pagination.hasMore);
        setTotal(pagination.total || 0);

        // Also refresh unread count
        fetchUnreadCount();
      } catch (err) {
        console.error("[useNotifications] Failed to fetch notifications:", err.message);
      } finally {
        setLoading(false);
      }
    },
    [user, fetchUnreadCount],
  );

  // 3. Mark single notification as read with optimistic update
  const markAsRead = useCallback(
    async (notificationId) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await markNotificationAsReadApi(notificationId);
      } catch (err) {
        console.error("[useNotifications] Error marking as read:", err);
        // Fallback refresh on failure
        fetchUnreadCount();
      }
    },
    [fetchUnreadCount],
  );

  // 4. Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: n.readAt || new Date().toISOString(),
      })),
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsAsReadApi();
    } catch (err) {
      console.error("[useNotifications] Error marking all as read:", err);
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // 5. Dismiss single notification
  const dismissNotification = useCallback(
    async (notificationId) => {
      // Find if dismissed item was unread to adjust badge
      const target = notifications.find((n) => n._id === notificationId);
      if (target && !target.readAt) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // Optimistic remove
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setTotal((prev) => Math.max(0, prev - 1));

      try {
        await dismissNotificationApi(notificationId);
      } catch (err) {
        console.error("[useNotifications] Error dismissing notification:", err);
        fetchNotifications(1, filterRef.current, false);
      }
    },
    [notifications, fetchNotifications],
  );

  // 6. Dismiss all active notifications
  const dismissAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    setTotal(0);

    try {
      await dismissAllNotificationsApi();
    } catch (err) {
      console.error("[useNotifications] Error dismissing all notifications:", err);
      fetchNotifications(1, filterRef.current, false);
    }
  }, [fetchNotifications]);

  // 7. Change filter and reload
  const handleSetFilter = useCallback(
    (newFilter) => {
      setFilter(newFilter);
      fetchNotifications(1, newFilter, false);
    },
    [fetchNotifications],
  );

  // Initial load & periodic unread count poll
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchNotifications(1, "all", false);

      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 60000); // 1 minute poll

      return () => clearInterval(interval);
    }
  }, [user, fetchUnreadCount, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    page,
    hasMore,
    total,
    filter,
    setFilter: handleSetFilter,
    fetchNotifications,
    fetchUnreadCount,
    loadMore: () => hasMore && fetchNotifications(page + 1, filter, true),
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAll,
  };
}
