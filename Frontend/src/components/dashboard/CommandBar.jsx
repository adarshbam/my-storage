import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePlan } from "../../context/PlanContext";
import { SERVER_URL } from "../../lib/api";
import {
  NeuralSearchIcon,
  VaultLogo,
  EncryptionBadgeIcon,
  SystemCoreIcon,
  VaultDriveIcon,
  VaultGitIcon,
} from "../ui/VaultIcons";
import ProfileMenu from "../ui/ProfileMenu";
import NotificationBell from "../notifications/NotificationBell";
import {
  Search,
  Bell,
  Upload,
  FolderPlus,
  FilePlus,
  Plus,
  Menu,
  PanelLeft,
  MoreVertical,
  Share2,
  X,
  HardDrive,
  User,
  Sparkles,
  Shield,
  Sliders,
  FolderLock,
} from "lucide-react";

export default function CommandBar({
  globalSearchQuery,
  setGlobalSearchQuery,
  handleSearchSubmit,
  handleCreateClick,
  handleCreateFileClick,
  handleProfilePicUpload,
  profilePicUrl,
  openUploadModal,
  openShareModal,
  isMobileOpen,
  setIsMobileOpen,
}) {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { isNoPlan, rules, hasFeature } = usePlan();
  const location = useLocation();

  const isVaultRoute =
    location.pathname === "/dashboard" ||
    location.pathname.startsWith("/dashboard/folder") ||
    location.pathname.startsWith("/dashboard/shared") ||
    location.pathname.startsWith("/dashboard/recent") ||
    location.pathname.startsWith("/dashboard/starred") ||
    location.pathname.startsWith("/dashboard/google-drive") ||
    location.pathname.startsWith("/dashboard/github") ||
    location.pathname.startsWith("/dashboard/trash") ||
    location.pathname.startsWith("/dashboard/admin") ||
    location.pathname.startsWith("/dashboard/owner/folder") ||
    location.pathname === "/dashboard/search";

  const allowUpload = !isNoPlan && (rules?.permissions?.allowUpload ?? true);

  const guardAction = (actionFn, requiresUpload = true) => {
    if (isNoPlan || (requiresUpload && !allowUpload)) {
      if (
        window.confirm(
          "Your current account is in Read-Only mode (No Active Plan). Would you like to view plans or activate your free trial to unlock this action?",
        )
      ) {
        navigate("/dashboard/billing");
      }
      return;
    }
    actionFn();
  };
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchScope, setSearchScope] = useState("current");
  const [searchExt, setSearchExt] = useState("");
  const [searchSize, setSearchSize] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const handleLogout = async () => {
    try {
      await fetch(`${SERVER_URL}/user/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      navigate("/");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await fetch(`${SERVER_URL}/user/logout-all`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      navigate("/");
    } catch (err) {
      console.error("Logout all devices failed", err);
    }
  };

  const onSearchExecute = (e) => {
    if (
      e.key === "Enter" &&
      (globalSearchQuery.trim() || searchExt || searchSize)
    ) {
      handleSearchSubmit(globalSearchQuery, {
        scope: searchScope,
        ext: searchExt,
        size: searchSize,
      });
      setShowRecentSearches(false);
      setShowFilters(false);
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close control center on escape
  useEffect(() => {
    if (!showMobileMenu) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setShowMobileMenu(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showMobileMenu]);

  // ── Quick Action Color Definitions ──
  const quickActions = [
    {
      label: "Share Vault",
      icon: Share2,
      onClick: () => guardAction(openShareModal, false),
      color: "var(--accent-primary)",
      hoverBg: "hover:bg-accent-soft",
      hoverText: "hover:text-accent-primary",
      glowHover: "hover:shadow-accent-glow-sm",
      tourId: "share-btn",
    },
    {
      label: "Upload Asset",
      icon: Upload,
      onClick: () => guardAction(openUploadModal, true),
      color: "#00CFFF", // Cyan
      hoverBg: "hover:bg-[rgba(0,207,255,0.1)]",
      hoverText: "hover:text-pulse-accent",
      glowHover: "hover:shadow-[0_0_15px_rgba(0,207,255,0.2)]",
      tourId: "upload-btn",
    },
    {
      label: "New Directory",
      icon: FolderPlus,
      onClick: () => guardAction(handleCreateClick, true),
      color: "#C65CFF", // Purple
      hoverBg: "hover:bg-[rgba(198,92,255,0.1)]",
      hoverText: "hover:text-relay-accent",
      glowHover: "hover:shadow-[0_0_15px_rgba(198,92,255,0.2)]",
      tourId: "new-dir-btn",
    },
    {
      label: "New File",
      icon: FilePlus,
      onClick: () => guardAction(handleCreateFileClick, true),
      color: "#FF7A3D", // Orange
      hoverBg: "hover:bg-[rgba(255,122,61,0.1)]",
      hoverText: "hover:text-linkdrive-accent",
      glowHover: "hover:shadow-[0_0_15px_rgba(255,122,61,0.2)]",
      tourId: "new-file-btn",
    },
  ];

  const userRole = user?.role?.toUpperCase() || "USER";
  const isOwner = userRole === "OWNER";
  const isManagerOrAdmin = ["OWNER", "ADMIN", "MANAGER"].includes(userRole);

  const navSections = [
    {
      name: "Vault Chamber",
      path: "/dashboard",
      icon: FolderLock,
      exact: true,
    },
    {
      name: "Storage & Plans",
      path: "/dashboard/billing",
      aliases: ["/billing"],
      icon: HardDrive,
    },
    {
      name: "Account Settings",
      path: "/profile",
      icon: User,
    },
    {
      name: "Wally's Academy",
      path: "/dashboard/tutorials",
      aliases: ["/tutorials"],
      icon: Sparkles,
    },
    ...(isManagerOrAdmin
      ? [
          {
            name: "User Management",
            path: "/users",
            icon: Shield,
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            name: "Owner Settings",
            path: "/owner/settings",
            icon: Sliders,
          },
        ]
      : []),
  ];

  const isSectionActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    if (
      location.pathname === item.path ||
      location.pathname.startsWith(`${item.path}/`)
    ) {
      return true;
    }
    if (
      item.aliases &&
      item.aliases.some(
        (a) => location.pathname === a || location.pathname.startsWith(`${a}/`),
      )
    ) {
      return true;
    }
    return false;
  };

  return (
    <header className="h-[64px] shrink-0 bg-white/95 dark:bg-vault-surface/95 backdrop-blur-3xl border-b border-slate-200 dark:border-white/10 z-50 flex items-center justify-between px-3 sm:px-6 sticky top-0 shadow-sm">
      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="absolute top-0 left-0 right-0 bg-white dark:bg-[#030706] z-[10000] border-b border-slate-200 dark:border-white/10 sm:hidden transition-all duration-300 shadow-xl">
          <div className="flex items-center px-4 h-[64px] gap-3">
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setShowFilters(false);
              }}
              className="text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white p-1 active:scale-95 transition-transform"
            >
              <X size={24} />
            </button>
            <div className="flex-1 relative">
              <input
                ref={(el) => {
                  if (el && mobileSearchOpen) el.focus();
                }}
                type="text"
                placeholder="Search classified assets..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit(globalSearchQuery, {
                      scope: searchScope,
                      ext: searchExt,
                      size: searchSize,
                    });
                    setMobileSearchOpen(false);
                    setShowFilters(false);
                  }
                }}
                className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white px-2 placeholder:text-slate-400 dark:placeholder:text-white/30 text-lg font-medium"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                showFilters
                  ? "bg-accent-soft text-accent-primary border border-accent-border shadow-accent-glow-sm"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 border border-transparent"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </button>
          </div>

          {/* Mobile Filter Panel */}
          {showFilters && (
            <div className="px-5 pb-6 pt-3 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#030706] max-h-[65vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-[10px] font-bold tracking-widest text-accent-primary uppercase mb-4 pb-2 border-b border-accent-border/30 flex items-center justify-between">
                <span>Advanced Search Filters</span>
                <span className="text-[9px] text-slate-500 dark:text-white/30 font-medium lowercase">
                  Active filters apply on enter
                </span>
              </h3>
              <div className="space-y-4">
                {/* Scope */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                    Search Scope
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchScope("current")}
                      className={`flex-1 text-xs py-2.5 rounded-xl border font-bold transition-all duration-200 ${
                        searchScope === "current"
                          ? "bg-accent-soft border-accent-primary text-accent-primary shadow-sm"
                          : "bg-white dark:bg-black/35 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Current Context
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchScope("global")}
                      className={`flex-1 text-xs py-2.5 rounded-xl border font-bold transition-all duration-200 ${
                        searchScope === "global"
                          ? "bg-accent-soft border-accent-primary text-accent-primary shadow-sm"
                          : "bg-white dark:bg-black/35 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Global Vault
                    </button>
                  </div>
                </div>

                {/* File Type & Size Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                      File Extension
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pdf, txt, png"
                      value={searchExt}
                      onChange={(e) => setSearchExt(e.target.value)}
                      className="w-full bg-white dark:bg-black/35 border border-slate-200 dark:border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-accent-primary transition-all placeholder:text-slate-400 dark:placeholder:text-white/20 font-semibold shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                      Maximum Size
                    </label>
                    <select
                      value={searchSize}
                      onChange={(e) => setSearchSize(e.target.value)}
                      className="w-full bg-white dark:bg-black/35 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-accent-primary transition-all font-semibold [&>option]:bg-white dark:[&>option]:bg-[#020d0a] shadow-sm"
                    >
                      <option value="">Any Size</option>
                      <option value="1">Under 1 MB</option>
                      <option value="10">Under 10 MB</option>
                      <option value="100">Under 100 MB</option>
                      <option value="1000">Under 1 GB</option>
                    </select>
                  </div>
                </div>

                {/* Submit Search Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleSearchSubmit(globalSearchQuery, {
                      scope: searchScope,
                      ext: searchExt,
                      size: searchSize,
                    });
                    setMobileSearchOpen(false);
                    setShowFilters(false);
                  }}
                  className="w-full mt-2 py-3 rounded-xl bg-accent-primary text-accent-foreground text-xs font-black tracking-widest uppercase active:scale-98 transition-transform shadow-accent-glow hover:opacity-95"
                >
                  Execute Search
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEFT: System Identity */}
      <div className="flex items-center gap-2 sm:gap-3 w-auto sm:w-[240px] shrink-0">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`md:hidden p-1.5 -ml-1 mr-1 rounded-xl border transition-all shadow-[inset_0_0_10px_rgba(0,212,165,0.05)] flex items-center justify-center
            ${
              isMobileOpen
                ? "bg-vault-emerald/10 border-vault-emerald/40 text-vault-emerald"
                : "bg-vault-emerald/5 border-vault-emerald/20 text-vault-emerald/70 hover:bg-vault-emerald/10 hover:text-vault-emerald hover:border-vault-emerald/40"
            }`}
          title="Toggle Vault Navigation"
        >
          <PanelLeft size={20} />
        </button>
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-3 group cursor-pointer"
          title="Go to Home"
        >
          <div className="bg-accent-soft border border-accent-border p-1 sm:p-1.5 rounded-xl shadow-sm relative group-hover:border-accent-primary transition-colors">
            <VaultLogo className="text-accent-primary" size={18} />
          </div>
          <span className="text-base sm:text-lg font-black tracking-widest text-slate-900 dark:text-white uppercase group-hover:text-accent-primary transition-colors">
            Vault O
          </span>
        </Link>
      </div>

      {/* CENTER: Neural Search (Vault Only) */}
      {isVaultRoute && (
        <div
          data-tour="command-bar-search"
          className="flex-1 max-w-2xl mx-4 hidden sm:flex justify-center"
        >
          <div className="relative w-full max-w-lg group">
            <div className="absolute inset-0 bg-accent-soft rounded-2xl blur-md group-hover:opacity-100 opacity-60 transition-opacity" />
            <div className="relative flex items-center bg-slate-100/90 dark:bg-vault-black/80 border border-slate-200/90 dark:border-white/10 rounded-2xl px-4 py-2 hover:border-accent-border focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 transition-all shadow-sm">
              <NeuralSearchIcon
                size={18}
                className="text-accent-primary group-focus-within:text-accent-primary transition-colors"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search classified assets..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onKeyDown={onSearchExecute}
                onFocus={() => setShowRecentSearches(true)}
                onBlur={() =>
                  setTimeout(() => setShowRecentSearches(false), 200)
                }
                className="w-full bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white px-3 placeholder:text-slate-400 dark:placeholder:text-white/30 font-medium"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-md transition-colors ${showFilters ? "bg-vault-emerald/20 text-vault-emerald" : "text-white/40 hover:text-white hover:bg-white/10"}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
              </button>
              <div className="flex items-center gap-1 opacity-50 ml-2">
                <kbd className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20">
                  ⌘
                </kbd>
                <kbd className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20">
                  K
                </kbd>
              </div>
            </div>

            {/* Filter Dropdown */}
            {showFilters && (
              <div className="absolute top-full sm:top-[calc(100%+8px)] left-0 mt-2 sm:mt-0 w-[100vw] sm:w-full -ml-4 sm:ml-0 bg-white/95 dark:bg-vault-surface/95 backdrop-blur-xl border-y sm:border border-slate-200 dark:border-white/10 sm:rounded-2xl shadow-2xl z-50 p-4 text-slate-900 dark:text-white max-h-[75vh] overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-bold tracking-widest text-accent-primary uppercase mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
                  Advanced Search
                </h3>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="text-xs text-slate-500 dark:text-white/50 w-20">
                      Scope
                    </label>
                    <div className="flex gap-2 flex-1 w-full">
                      <button
                        onClick={() => setSearchScope("current")}
                        className={`flex-1 text-xs py-1.5 rounded-xl border transition-all ${searchScope === "current" ? "bg-accent-soft border-accent-primary text-accent-primary font-bold shadow-sm" : "bg-slate-100 dark:bg-black/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                      >
                        Current Context
                      </button>
                      <button
                        onClick={() => setSearchScope("global")}
                        className={`flex-1 text-xs py-1.5 rounded-xl border transition-all ${searchScope === "global" ? "bg-accent-soft border-accent-primary text-accent-primary font-bold shadow-sm" : "bg-slate-100 dark:bg-black/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                      >
                        Global Vault
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="text-xs text-slate-500 dark:text-white/50 w-20">
                      Type (Ext)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pdf, txt"
                      value={searchExt}
                      onChange={(e) => setSearchExt(e.target.value)}
                      className="w-full sm:flex-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <label className="text-xs text-slate-500 dark:text-white/50 w-20">
                      Max Size
                    </label>
                    <select
                      value={searchSize}
                      onChange={(e) => setSearchSize(e.target.value)}
                      className="w-full sm:flex-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-accent-primary [&>option]:bg-white dark:[&>option]:bg-vault-black"
                    >
                      <option value="">Any Size</option>
                      <option value="1">Under 1 MB</option>
                      <option value="10">Under 10 MB</option>
                      <option value="100">Under 100 MB</option>
                      <option value="1000">Under 1 GB</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RIGHT: Quick Actions & Status */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Create Actions (Vault Only) */}
        {isVaultRoute && (
          <div
            data-tour="quick-actions"
            className="hidden lg:flex items-center gap-1 border-r border-slate-200 dark:border-white/10 pr-3 mr-1"
          >
            {location.pathname === "/dashboard/github" ? (
              <button
                onClick={() =>
                  document.dispatchEvent(new CustomEvent("createRepoTrigger"))
                }
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-soft text-accent-primary border border-accent-border hover:bg-accent-primary hover:text-accent-foreground text-xs font-bold transition-all shadow-sm active:scale-95"
                title="Create New GitHub Repository"
              >
                <Plus size={14} />
                <span>New Repository</span>
              </button>
            ) : (
              quickActions.map((action) => (
                <button
                  key={action.label}
                  data-tour={action.tourId}
                  onClick={() => {
                    action.onClick();
                  }}
                  className={`p-2 text-slate-500 dark:text-white/50 ${action.hoverText} ${action.hoverBg} ${action.glowHover} rounded-xl transition-all duration-200`}
                  title={action.label}
                >
                  <action.icon size={18} />
                </button>
              ))
            )}
          </div>
        )}

        {/* Mobile Navigation & Control Center Toggle */}
        <div className="lg:hidden relative">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
              showMobileMenu
                ? "bg-accent-soft text-accent-primary border-accent-border shadow-accent-glow-sm"
                : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
            }`}
            title="Navigation Menu"
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Integration Status */}
        <div className="hidden md:flex items-center gap-2 border-r border-slate-200 dark:border-white/10 pr-3 mr-1">
          {user?.integrations?.googleDrive?.connected && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linkdrive-accent/10 border border-linkdrive-accent/20"
              title="Google Drive Connected"
            >
              <VaultDriveIcon size={14} className="text-linkdrive-accent" />
            </div>
          )}
          {user?.integrations?.github?.connected && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-linkgit-accent/10 border border-linkgit-accent/20"
              title="GitHub Connected"
            >
              <VaultGitIcon size={14} className="text-linkgit-accent" />
            </div>
          )}
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Profile */}
        <ProfileMenu
          user={user}
          profilePicUrl={profilePicUrl}
          onLogout={handleLogout}
          onLogoutAll={handleLogoutAll}
          onProfilePicUpload={handleProfilePicUpload}
        />
      </div>

      {/* ── Mobile Control Center & Navigation Dropdown (Aligned with Standalone Pages) ── */}
      {showMobileMenu && (
        <div className="absolute top-[64px] left-0 right-0 bg-white/95 dark:bg-vault-surface/95 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 shadow-2xl p-4 lg:hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-64px)] overflow-y-auto custom-scrollbar">
          {/* Quick Search Shortcut */}
          <button
            onClick={() => {
              setShowMobileMenu(false);
              setMobileSearchOpen(true);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 mb-4 sm:hidden"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-accent-soft text-accent-primary border border-accent-border">
              <Search size={16} />
            </div>
            <span className="text-xs font-semibold">
              Search Vault Assets...
            </span>
          </button>

          {/* Quick Actions (Vault Only) */}
          {isVaultRoute && (
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 px-2 mb-2">
                Vault Actions
              </div>
              {location.pathname === "/dashboard/github" ? (
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    document.dispatchEvent(
                      new CustomEvent("createRepoTrigger"),
                    );
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-accent-primary text-accent-foreground font-bold text-xs shadow-accent-glow active:scale-95 transition-transform"
                >
                  <Plus size={16} />
                  <span>Create New Repository</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setShowMobileMenu(false);
                        action.onClick();
                      }}
                      className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all text-left group"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-white/10 transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${action.color}15`,
                        }}
                      >
                        <action.icon
                          size={16}
                          style={{ color: action.color }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white/90 truncate">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigate Sections */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 px-2 mb-2">
              Navigate Sections
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {navSections.map((item) => {
                const active = isSectionActive(item);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      active
                        ? "bg-accent-soft border-accent-border text-accent-primary font-bold shadow-sm"
                        : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        active
                          ? "bg-accent-primary text-accent-foreground"
                          : "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-semibold">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
