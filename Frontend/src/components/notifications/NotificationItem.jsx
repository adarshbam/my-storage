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

  // ── Category Icon & Label ──
  const getCategoryConfig = (type) => {
    switch (type) {
      case "security":
        return {
          label: "Security",
          icon: ShieldAlert,
          badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      case "subscription":
        return {
          label: "Plan",
          icon: Zap,
          badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "billing":
        return {
          label: "Billing",
          icon: CreditCard,
          badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        };
      case "storage":
        return {
          label: "Storage",
          icon: HardDrive,
          badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "system":
      default:
        return {
          label: "System",
          icon: Info,
          badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        };
    }
  };

  // ── Severity Styling ──
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case "critical":
        return {
          icon: AlertOctagon,
          borderColor: "border-rose-500/40",
          glowColor: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
          accentColor: "text-rose-400",
          iconBg: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
          btnGradient:
            "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          borderColor: "border-amber-500/40",
          glowColor: "shadow-[0_0_15px_rgba(245,158,11,0.12)]",
          accentColor: "text-amber-400",
          iconBg: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
          btnGradient:
            "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]",
        };
      case "success":
        return {
          icon: CheckCircle2,
          borderColor: "border-emerald-500/30",
          glowColor: "shadow-[0_0_15px_rgba(16,185,129,0.1)]",
          accentColor: "text-emerald-400",
          iconBg: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
          btnGradient:
            "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white",
        };
      case "info":
      default:
        return {
          icon: Sparkles,
          borderColor: "border-teal-500/30",
          glowColor: "shadow-[0_0_15px_rgba(20,184,166,0.1)]",
          accentColor: "text-teal-400",
          iconBg: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
          btnGradient:
            "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white",
        };
    }
  };

  const category = getCategoryConfig(notification.type);
  const severity = getSeverityConfig(notification.severity);
  const SeverityIcon = severity.icon;

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
      className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
        isUnread
          ? `bg-white/[0.04] dark:bg-white/[0.03] ${severity.borderColor} ${severity.glowColor}`
          : "bg-white/[0.01] dark:bg-black/20 border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Severity Icon Avatar */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${severity.iconBg}`}
        >
          <SeverityIcon size={18} />
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Category Badge, Timestamp, Status & Dismiss */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${category.badgeColor}`}
              >
                {category.label}
              </span>

              {isResolved && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Check size={10} /> Resolved
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-white/40">
                {formatRelativeTime(notification.createdAt)}
              </span>

              {/* Unread indicator dot */}
              {isUnread && (
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              )}

              {/* Dismiss button */}
              <button
                onClick={handleDismissClick}
                className="opacity-0 group-hover:opacity-100 p-1 -mr-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
            {notification.title}
          </h4>

          {/* Message */}
          <p className="text-xs text-white/70 mt-1 leading-relaxed break-words font-normal">
            {notification.message}
          </p>

          {/* Optional Action CTA Button (Only show if NOT resolved) */}
          {notification.action?.label && notification.action?.route && !isResolved && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleActionClick}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${severity.btnGradient}`}
              >
                <span>{notification.action.label}</span>
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
