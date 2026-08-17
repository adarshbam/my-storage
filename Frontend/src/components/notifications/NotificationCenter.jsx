import { useEffect } from "react";
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile / outside click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm lg:bg-transparent"
          />

          {/* Notification Center Floating Panel / Drawer */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed lg:absolute top-16 sm:top-20 right-2 sm:right-6 lg:right-0 z-[130] w-[calc(100vw-1rem)] sm:w-[460px] max-h-[85vh] flex flex-col rounded-3xl bg-white/98 dark:bg-[#030d0a]/95 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-2 bg-slate-50/60 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent-soft border border-accent-border flex items-center justify-center text-accent-primary">
                  <Bell size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent-primary border border-accent-border animate-pulse">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    <span className="hidden sm:inline">Read all</span>
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={dismissAll}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-500/15 hover:border-rose-500/30 text-slate-500 dark:text-white/50 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-white/10 text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Clear all notifications"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 dark:text-white/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all"
                  title="Close notifications"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filter Tabs Bar */}
            <div className="px-3 sm:px-4 py-2.5 border-b border-slate-100 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar bg-slate-50 dark:bg-black/20">
              {filterTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-accent-soft border border-accent-border text-accent-primary shadow-accent-glow-sm"
                        : "bg-transparent text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-soft text-accent-primary">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar min-h-[220px] max-h-[58vh]">
              {loading && notifications.length === 0 ? (
                /* Skeleton Placeholders */
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse flex items-start gap-3.5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="w-1/3 h-3 bg-white/10 rounded" />
                        <div className="w-3/4 h-4 bg-white/10 rounded" />
                        <div className="w-full h-3 bg-white/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                /* Empty State */
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3.5 shadow-inner">
                    <Inbox size={26} />
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    All caught up!
                  </h4>
                  <p className="text-xs text-white/50 mt-1 max-w-[260px] leading-relaxed">
                    {filter === "unread"
                      ? "You have zero unread alerts. Your account is in perfect standing."
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
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {loading ? "Loading..." : "Load Older Notifications"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Status Bar */}
            <div className="px-4 py-2.5 border-t border-white/5 bg-black/40 flex items-center justify-between text-[11px] text-white/40">
              <span>Vault Notification Service</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
