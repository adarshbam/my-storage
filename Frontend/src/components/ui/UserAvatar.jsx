import React, { useState, useEffect } from "react";
import { getProfilePicUrl, getInitials } from "../../lib/utils";

/**
 * UserAvatar component that reliably renders:
 * - Profile image if present and valid
 * - Prominent capitalized first-letter initial badge if missing or if image fails to load
 * - Online / Offline / Terminated status indicator dot
 */
export default function UserAvatar({
  user,
  src,
  name,
  email,
  size = "md",
  shape = "rounded",
  status,
  className = "",
  glow = false,
  bordered = true,
  fallbackClassName = "",
  onClick,
}) {
  const [hasError, setHasError] = useState(false);

  const rawPic =
    src !== undefined
      ? src
      : user?.profilepic || user?.profilePic || user?.avatarUrl;
  const avatarUrl = getProfilePicUrl(rawPic);

  // Reset error state if the URL changes
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const userName = name || user?.name || "";
  const userEmail = email || user?.email || "";
  const initial = getInitials(userName, userEmail);

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
    "2xl": "w-20 h-20 text-2xl",
    "3xl": "w-24 h-24 text-3xl",
  };

  const roundedClasses = {
    rounded: "rounded-2xl",
    circle: "rounded-full",
    xl: "rounded-3xl",
  };

  const statusDotSizes = {
    xs: "w-2 h-2 -bottom-0.5 -right-0.5",
    sm: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
    md: "w-3 h-3 -bottom-0.5 -right-0.5",
    lg: "w-3.5 h-3.5 -bottom-1 -right-1",
    xl: "w-4 h-4 -bottom-1 -right-1",
    "2xl": "w-5 h-5 -bottom-1 -right-1",
    "3xl": "w-5 h-5 -bottom-1 -right-1",
  };

  const containerSize = sizeClasses[size] || size;
  const radius = roundedClasses[shape] || "rounded-2xl";

  const getStatusColor = (st) => {
    const s = String(st).toUpperCase();
    if (s === "ONLINE")
      return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
    if (s === "TERMINATED")
      return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
    if (s === "DEACTIVATED" || s === "DELETED")
      return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]";
    return "bg-slate-400 dark:bg-white/20";
  };

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 select-none ${className}`}
    >
      <div
        className={`${containerSize} ${radius} overflow-hidden flex items-center justify-center relative transition-all duration-200 ${
          bordered ? "border border-slate-200 dark:border-white/10" : ""
        } ${
          glow
            ? "shadow-accent-glow border-2 border-accent-border bg-accent-soft"
            : "bg-slate-100 dark:bg-vault-surface"
        }`}
      >
        {avatarUrl && !hasError ? (
          <img
            src={avatarUrl}
            alt={userName || "Avatar"}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span
            className={`font-black uppercase tracking-tight text-slate-700 dark:text-white/90 ${
              glow ? "text-accent-primary" : ""
            } ${fallbackClassName}`}
          >
            {initial}
          </span>
        )}
      </div>

      {status && (
        <span
          className={`absolute rounded-full border-2 border-white dark:border-vault-black flex items-center justify-center ${
            statusDotSizes[size] || "w-3.5 h-3.5 -bottom-1 -right-1"
          } ${getStatusColor(status)}`}
        >
          {String(status).toUpperCase() === "TERMINATED" && (
            <span className="text-[7px] font-black text-white leading-none">✕</span>
          )}
        </span>
      )}
    </div>
  );
}
