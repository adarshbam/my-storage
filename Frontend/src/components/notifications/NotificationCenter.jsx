import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Sparkles,
  ShieldAlert,
  Zap,
  CreditCard,
  HardDrive,
  Inbox,
} from "lucide-react";
import NotificationItem from "./NotificationItem";

export default function NotificationCenter({
  isOpen,
  onClose,
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
}) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filterTabs = [
    { id: "all", label: "All", icon: Bell },
    {
      id: "unread",
      label: "Unread",
      icon: Sparkles,
      count: unreadCount > 0 ? unreadCount : null,
    },
    { id: "security", label: "Security", icon: ShieldAlert },
    { id: "subscription", label: "Plans", icon: Zap },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "storage", label: "Storage", icon: HardDrive },
  ];

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for outside click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[99990] bg-black/50 backdrop-blur-xs"
          />

          {/* Notification Center Floating Panel / Drawer */}
          <motion.div
            data-notification-center
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-16 sm:top-20 right-3 sm:right-6 z-[99999] w-[calc(100vw-1.5rem)] sm:w-[460px] max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-2xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden"
          >
            {/* Very Subtle Ambient Top Theme Aura */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[140px] bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-primary-rgb),0.08)_0%,transparent_70%)] pointer-events-none z-0" />

            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 bg-slate-50 dark:bg-white/[0.02] relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-soft border border-accent-border/30 flex items-center justify-center text-accent-primary shrink-0 shadow-xs">
                  <Bell size={15} />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-accent-soft text-accent-primary border border-accent-border/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    <span className="hidden sm:inline">Read all</span>
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={dismissAll}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                    title="Clear all notifications"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"
                  title="Close notifications"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Filter Tabs Bar - Segmented Style */}
            <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar bg-slate-100/70 dark:bg-black/40 relative z-10">
              {filterTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-accent-primary text-white font-bold shadow-xs"
                        : "bg-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 font-medium"
                    }`}
                  >
                    <Icon size={12} />
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive
                            ? "bg-white/25 text-white font-bold"
                            : "bg-slate-200 dark:bg-white/15 text-slate-700 dark:text-slate-200 font-bold"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-[200px] max-h-[56vh] relative z-10">
              {loading && notifications.length === 0 ? (
                /* Skeleton Placeholders */
                <div className="space-y-2">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.02] animate-pulse flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="w-1/4 h-2.5 bg-slate-200 dark:bg-white/10 rounded" />
                        <div className="w-2/3 h-3 bg-slate-200 dark:bg-white/10 rounded" />
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-white/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                /* Empty State */
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-white/40 mb-3">
                    <Inbox size={22} />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    All caught up!
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-300 mt-1 max-w-[240px] leading-relaxed">
                    {filter === "unread"
                      ? "You have zero unread alerts. Your vault is fully synchronized."
                      : "No notifications found in this category."}
                  </p>
                </div>
              ) : (
                /* Notifications List */
                <>
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDismiss={dismissNotification}
                      onCloseCenter={onClose}
                    />
                  ))}

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white border border-slate-200 dark:border-white/15 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? "Loading..." : "Load Older Notifications"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Status Bar */}
            <div className="px-4 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-300 relative z-10">
              <span>VAULT NOTIFICATION SERVICE</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                <span className="text-accent-primary font-semibold">Live Sync</span>
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
