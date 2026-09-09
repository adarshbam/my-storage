import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationCenter from "./NotificationCenter";

export default function NotificationBell({ className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    dismissAll,
    loadMore,
  } = useNotifications();

  // Close on outside click for desktop popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking inside the portaled notification center
      if (event.target && event.target.closest && event.target.closest("[data-notification-center]")) {
        return;
      }
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Bell Trigger Button */}
      <button
        onClick={toggleOpen}
        className={`relative p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
          isOpen
            ? "bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
            : "bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.08] border-transparent hover:border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        }`}
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell size={18} />

        {/* Live Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 border-2 border-white dark:border-[#0a0e14] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Center Popover */}
      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        hasMore={hasMore}
        filter={filter}
        setFilter={setFilter}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        dismissNotification={dismissNotification}
        dismissAll={dismissAll}
        loadMore={loadMore}
      />
    </div>
  );
}
