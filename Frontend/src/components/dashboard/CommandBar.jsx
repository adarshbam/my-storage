import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
import {
  Search,
  Bell,
  Upload,
  FolderPlus,
  FilePlus,
  Menu,
  PanelLeft,
  MoreVertical,
  Share2,
  X,
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
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      onClick: openShareModal,
      color: "#00D4A5", // Emerald
      hoverBg: "hover:bg-[rgba(0,212,165,0.1)]",
      hoverText: "hover:text-vault-emerald",
      glowHover: "hover:shadow-[0_0_15px_rgba(0,212,165,0.2)]",
    },
    {
      label: "Upload Asset",
      icon: Upload,
      onClick: openUploadModal,
      color: "#00CFFF", // Cyan
      hoverBg: "hover:bg-[rgba(0,207,255,0.1)]",
      hoverText: "hover:text-pulse-accent",
      glowHover: "hover:shadow-[0_0_15px_rgba(0,207,255,0.2)]",
    },
    {
      label: "New Directory",
      icon: FolderPlus,
      onClick: handleCreateClick,
      color: "#C65CFF", // Purple
      hoverBg: "hover:bg-[rgba(198,92,255,0.1)]",
      hoverText: "hover:text-relay-accent",
      glowHover: "hover:shadow-[0_0_15px_rgba(198,92,255,0.2)]",
    },
    {
      label: "New File",
      icon: FilePlus,
      onClick: handleCreateFileClick,
      color: "#FF7A3D", // Orange
      hoverBg: "hover:bg-[rgba(255,122,61,0.1)]",
      hoverText: "hover:text-linkdrive-accent",
      glowHover: "hover:shadow-[0_0_15px_rgba(255,122,61,0.2)]",
    },
  ];

  return (
    <header className="h-[64px] shrink-0 vault-glass border-b border-vault-emerald/10 z-50 flex items-center justify-between px-3 sm:px-6 sticky top-0">
      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="absolute top-0 left-0 right-0 bg-[#030706] z-[10000] border-b border-vault-emerald/20 sm:hidden transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center px-4 h-[64px] gap-3">
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setShowFilters(false);
              }}
              className="text-white/50 hover:text-white p-1 active:scale-95 transition-transform"
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
                className="w-full bg-transparent border-none outline-none text-white px-2 placeholder:text-white/30 text-lg font-medium"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-all active:scale-95 ${
                showFilters
                  ? "bg-vault-emerald/20 text-vault-emerald border border-vault-emerald/30 shadow-[0_0_15px_rgba(0,212,165,0.25)]"
                  : "text-white/50 hover:text-white bg-white/5 border border-transparent"
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
            <div className="px-5 pb-6 pt-3 border-t border-white/[0.06] bg-[#030706]">
              <h3 className="text-[10px] font-bold tracking-widest text-vault-emerald uppercase mb-4 pb-2 border-b border-vault-emerald/10 flex items-center justify-between">
                <span>Advanced Search Filters</span>
                <span className="text-[9px] text-white/30 font-medium lowercase">
                  Active filters apply on enter
                </span>
              </h3>
              <div className="space-y-4">
                {/* Scope */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Search Scope
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchScope("current")}
                      className={`flex-1 text-xs py-2.5 rounded-xl border font-bold transition-all duration-200 ${
                        searchScope === "current"
                          ? "bg-vault-emerald/10 border-vault-emerald/50 text-vault-emerald shadow-[inset_0_0_12px_rgba(0,212,165,0.1)]"
                          : "bg-black/35 border-white/5 text-white/40 hover:text-white"
                      }`}
                    >
                      Current Context
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchScope("global")}
                      className={`flex-1 text-xs py-2.5 rounded-xl border font-bold transition-all duration-200 ${
                        searchScope === "global"
                          ? "bg-vault-emerald/10 border-vault-emerald/50 text-vault-emerald shadow-[inset_0_0_12px_rgba(0,212,165,0.1)]"
                          : "bg-black/35 border-white/5 text-white/40 hover:text-white"
                      }`}
                    >
                      Global Vault
                    </button>
                  </div>
                </div>

                {/* File Type & Size Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      File Extension
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. pdf, txt, png"
                      value={searchExt}
                      onChange={(e) => setSearchExt(e.target.value)}
                      className="w-full bg-black/35 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-vault-emerald/30 focus:bg-black/60 transition-all placeholder:text-white/20 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      Maximum Size
                    </label>
                    <select
                      value={searchSize}
                      onChange={(e) => setSearchSize(e.target.value)}
                      className="w-full bg-black/35 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-vault-emerald/30 focus:bg-black/60 transition-all font-semibold [&>option]:bg-[#020d0a] [&>option]:text-white"
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
                  className="w-full mt-2 py-3 rounded-xl bg-vault-emerald text-black text-xs font-black tracking-widest uppercase active:scale-98 transition-transform shadow-[0_4px_20px_rgba(0,212,165,0.25)] hover:shadow-[0_4px_25px_rgba(0,212,165,0.4)]"
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
        <div className="bg-[#01140f] border border-vault-emerald/30 p-1 sm:p-1.5 rounded-xl shadow-glow-green relative group-hover:border-vault-emerald transition-colors">
          <VaultLogo className="text-vault-emerald" size={18} />
        </div>
        <span className="text-base sm:text-lg font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 uppercase">
          Vault OS
        </span>
      </div>

      {/* CENTER: Neural Search */}
      <div className="flex-1 max-w-2xl mx-4 hidden sm:flex justify-center">
        <div className="relative w-full max-w-lg group">
          <div className="absolute inset-0 bg-vault-emerald/5 rounded-2xl blur-md group-hover:bg-vault-emerald/10 transition-colors" />
          <div className="relative flex items-center bg-vault-black/80 border border-white/10 rounded-2xl px-4 py-2 hover:border-vault-emerald/30 focus-within:border-vault-emerald/50 focus-within:shadow-[0_0_20px_rgba(0,212,165,0.15)] transition-all">
            <NeuralSearchIcon
              size={18}
              className="text-vault-emerald/70 group-focus-within:text-vault-emerald transition-colors"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search classified assets..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onKeyDown={onSearchExecute}
              onFocus={() => setShowRecentSearches(true)}
              onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
              className="w-full bg-transparent border-none outline-none text-sm text-white px-3 placeholder:text-white/30 font-medium"
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
            <div className="absolute top-full sm:top-[calc(100%+8px)] left-0 mt-2 sm:mt-0 w-[100vw] sm:w-full -ml-4 sm:ml-0 bg-[#01140f]/95 backdrop-blur-xl border-y sm:border border-vault-emerald/30 sm:rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 p-4">
              <h3 className="text-xs font-bold tracking-widest text-vault-emerald uppercase mb-4 border-b border-vault-emerald/20 pb-2">
                Advanced Search
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-xs text-white/50 w-20">Scope</label>
                  <div className="flex gap-2 flex-1 w-full">
                    <button
                      onClick={() => setSearchScope("current")}
                      className={`flex-1 text-xs py-1.5 rounded-md border transition-all ${searchScope === "current" ? "bg-vault-emerald/10 border-vault-emerald text-vault-emerald" : "bg-black/40 border-white/10 text-white/50 hover:text-white"}`}
                    >
                      Current Context
                    </button>
                    <button
                      onClick={() => setSearchScope("global")}
                      className={`flex-1 text-xs py-1.5 rounded-md border transition-all ${searchScope === "global" ? "bg-vault-emerald/10 border-vault-emerald text-vault-emerald" : "bg-black/40 border-white/10 text-white/50 hover:text-white"}`}
                    >
                      Global Vault
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-xs text-white/50 w-20">
                    Type (Ext)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. pdf, txt"
                    value={searchExt}
                    onChange={(e) => setSearchExt(e.target.value)}
                    className="w-full sm:flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-vault-emerald/50"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <label className="text-xs text-white/50 w-20">Max Size</label>
                  <select
                    value={searchSize}
                    onChange={(e) => setSearchSize(e.target.value)}
                    className="w-full sm:flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-vault-emerald/50 [&>option]:bg-vault-black"
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

      {/* RIGHT: Quick Actions & Status */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Create Actions — Color-Coded */}
        <div className="hidden lg:flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                action.onClick();
              }}
              className={`p-2 text-white/50 ${action.hoverText} ${action.hoverBg} ${action.glowHover} rounded-xl transition-all duration-300`}
              title={action.label}
            >
              <action.icon size={18} />
            </button>
          ))}
        </div>

        {/* Mobile Control Center Toggle */}
        <div className="lg:hidden relative">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`p-1.5 sm:p-2 rounded-xl transition-all duration-300 ${
              showMobileMenu
                ? "bg-vault-emerald/10 text-vault-emerald border border-vault-emerald/30"
                : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            {showMobileMenu ? <X size={20} /> : <MoreVertical size={20} />}
          </button>
        </div>

        {/* Integration Status */}
        <div className="hidden md:flex items-center gap-2 border-r border-white/10 pr-3 mr-1">
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
        <button className="relative p-2 text-white/50 hover:text-white transition-colors">
          <Bell size={20} />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger-accent border-2 border-vault-surface rounded-full" />
        </button>

        {/* Profile */}
        <ProfileMenu
          user={user}
          profilePicUrl={profilePicUrl}
          onLogout={handleLogout}
          onLogoutAll={handleLogoutAll}
          onProfilePicUpload={handleProfilePicUpload}
        />
      </div>

      {/* ── Mobile Control Center ── */}
      {showMobileMenu &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="control-center-backdrop fixed inset-0 bg-black/70 backdrop-blur-xl z-[100] lg:hidden"
              onClick={() => setShowMobileMenu(false)}
            />

            {/* Panel */}
            <div className="control-center-panel">
              {/* Handle bar */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Search Row */}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setMobileSearchOpen(true);
                }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-vault-surface/80 border border-white/10 backdrop-blur-md mb-4 active:scale-[0.98] transition-transform sm:hidden"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-vault-emerald/10">
                  <Search size={20} className="text-vault-emerald" />
                </div>
                <span className="text-sm font-semibold text-white/70">
                  Search Vault
                </span>
              </button>

              {/* Action Grid — 2x2 Color-Coded Tiles */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {quickActions.map((action, idx) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setShowMobileMenu(false);
                      action.onClick();
                    }}
                    className="control-center-tile relative flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-2xl border border-white/10 backdrop-blur-md bg-vault-surface/80 active:scale-95 transition-transform duration-150"
                    style={{
                      animationDelay: `${idx * 50}ms`,
                    }}
                  >
                    {/* Colored glow behind icon */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ boxShadow: `inset 0 0 30px ${action.color}15` }}
                    />

                    {/* Icon with color */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 relative"
                      style={{
                        backgroundColor: `${action.color}15`,
                        boxShadow: `0 0 20px ${action.color}10`,
                      }}
                    >
                      <action.icon
                        size={22}
                        style={{ color: action.color }}
                        className="relative z-10"
                      />
                    </div>

                    {/* Label */}
                    <span className="text-[11px] sm:text-xs font-semibold text-white/70 tracking-wide text-center leading-tight">
                      {action.label}
                    </span>

                    {/* Colored bottom accent line */}
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full opacity-40"
                      style={{ backgroundColor: action.color }}
                    />
                  </button>
                ))}
              </div>

              {/* Cancel */}
              <button
                onClick={() => setShowMobileMenu(false)}
                className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-white/50 active:scale-[0.98] transition-transform"
              >
                Cancel
              </button>
            </div>
          </>,
          document.body,
        )}
    </header>
  );
}
