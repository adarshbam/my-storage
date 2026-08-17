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
        className={`relative p-2.5 rounded-2xl border transition-all duration-200 ${
          isOpen
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-white/20 text-white/70 hover:text-white"
        }`}
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell size={19} />

        {/* Live Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-gradient-to-r from-rose-500 to-rose-600 border-2 border-vault-surface rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse">
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
