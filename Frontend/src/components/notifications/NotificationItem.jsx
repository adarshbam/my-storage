import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Zap,
  CreditCard,
  HardDrive,
  Info,
  Check,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
} from "lucide-react";

/**
 * Human-readable relative time formatting
 */
function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onCloseCenter,
}) {
  const navigate = useNavigate();
  const isUnread = !notification.readAt;
  const isResolved = !!notification.resolvedAt;

  // ── 3 Principal Semantic Color Engine ──
  // Green = Good / Verified / Active / Success
  // Yellow = Paused / Warning / Pending / Expiring
  // Red = Canceled / Critical / Error / Failed
  const getSemanticColorConfig = () => {
    const textToCheck = `${notification.title || ""} ${notification.message || ""} ${notification.eventKey || ""}`.toLowerCase();
    const rawSeverity = (notification.severity || "").toLowerCase();

    // 1. Critical / Canceled / Error -> RED
    if (
      rawSeverity === "critical" ||
      rawSeverity === "danger" ||
      /cancel|fail|error|delet|terminat|disable|revok|suspend|breach|unauthoriz/.test(textToCheck)
    ) {
      return {
        type: "red",
        icon: AlertOctagon,
        leftAccent: "border-l-rose-500",
        iconBg: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30",
        dotColor: "bg-rose-500",
        isDestructive: true,
      };
    }

    // 2. Paused / Warning / Pending -> YELLOW
    if (
      rawSeverity === "warning" ||
      /pause|expir|pending|limit|threshold|caution|attention|action required|incomplete/.test(textToCheck)
    ) {
      return {
        type: "yellow",
        icon: AlertTriangle,
        leftAccent: "border-l-amber-500",
        iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
        dotColor: "bg-amber-500",
        isDestructive: false,
      };
    }

    // 3. Good / Verified / Success -> GREEN (Default principal color)
    return {
      type: "green",
      icon: CheckCircle2,
      leftAccent: "border-l-emerald-500",
      iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
      dotColor: "bg-emerald-500",
      isDestructive: false,
    };
  };

  const getCategoryLabel = (type) => {
    switch (type) {
      case "security":
        return "Security";
      case "subscription":
        return "Plan";
      case "billing":
        return "Billing";
      case "storage":
        return "Storage";
      case "system":
      default:
        return "System";
    }
  };

  const semantic = getSemanticColorConfig();
  const StatusIcon = semantic.icon;
  const categoryLabel = getCategoryLabel(notification.type);

  const handleItemClick = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }
  };

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }
    if (onCloseCenter) onCloseCenter();
    if (notification.action?.route) {
      navigate(notification.action.route);
    }
  };

  const handleDismissClick = (e) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(notification._id);
    }
  };

  return (
    <div
      onClick={handleItemClick}
      className={`group relative p-3 sm:p-3.5 rounded-xl border border-l-2 transition-all duration-150 cursor-pointer ${
        semantic.leftAccent
      } ${
        isUnread
          ? "bg-white dark:bg-[#131a29] border-slate-200 dark:border-white/10 shadow-xs dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
          : "bg-slate-50/90 dark:bg-[#0f1624] border-slate-200/80 dark:border-white/[0.08] hover:bg-white dark:hover:bg-[#151c2d] hover:border-slate-300 dark:hover:border-white/15"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Semantic Status Icon Avatar - High Contrast, Clear Signal */}
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${semantic.iconBg}`}
        >
          <StatusIcon size={15} />
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Category Badge, Timestamp, Status Dot & Dismiss */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/15">
                {categoryLabel}
              </span>

              {isResolved && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <Check size={10} /> Resolved
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                {formatRelativeTime(notification.createdAt)}
              </span>

              {/* Unread micro-indicator dot */}
              {isUnread && (
                <div className={`w-1.5 h-1.5 rounded-full ${semantic.dotColor} shrink-0 shadow-xs`} />
              )}

              {/* Dismiss button */}
              <button
                onClick={handleDismissClick}
                className="opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded-md text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all cursor-pointer"
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
            {notification.title}
          </h4>

          {/* Message */}
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed break-words font-normal">
            {notification.message}
          </p>

          {/* Optional Action Button - Crisp, Distinct Secondary CTA */}
          {notification.action?.label && notification.action?.route && !isResolved && (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleActionClick}
                className={
                  semantic.isDestructive
                    ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all active:scale-98 shadow-xs cursor-pointer"
                    : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 active:bg-slate-300 dark:active:bg-white/[0.25] text-slate-900 dark:text-white border border-slate-300 dark:border-white/15 text-xs font-semibold transition-all active:scale-98 shadow-xs cursor-pointer"
                }
              >
                <span>{notification.action.label}</span>
                <ExternalLink size={12} className="text-slate-500 dark:text-slate-300 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
