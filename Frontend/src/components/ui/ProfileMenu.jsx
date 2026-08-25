import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  CreditCard,
  Monitor,
  Camera,
  ShieldCheck,
  Shield,
  Sliders,
  ChevronRight,
  Cloud,
  X,
  Palette,
  Moon,
  Sun,
  Check,
  Maximize,
  Minimize,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatSize, getProfilePicUrl, getInitials } from "../../lib/utils";
import { SERVER_URL } from "../../lib/api";
import { supportedCountries } from "../../lib/currency";
import { useTheme } from "./ThemeProvider";
import { usePlan } from "../../context/PlanContext";

export default function ProfileMenu({
  user,
  profilePicUrl,
  onLogout,
  onLogoutAll,
  onProfilePicUpload,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const { maxStorage: planMaxStorage, subscription } = usePlan();
  const maxStorage =
    planMaxStorage ||
    subscription?.maxStorage ||
    subscription?.storageLimit ||
    user?.maxStorage ||
    5368709120;
  const usedStorage = user?.usedStorage || 0;
  const navigate = useNavigate();

  const { theme, setTheme, accent, setAccent, palettes } = useTheme();

  const resolvedAvatarUrl = getProfilePicUrl(profilePicUrl || user?.profilepic);
  const userInitial = getInitials(user?.name, user?.email);

  useEffect(() => {
    setImgError(false);
  }, [resolvedAvatarUrl]);

  // Owner configuration settings state
  const [ownerSettingsOpen, setOwnerSettingsOpen] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [devicesLimit, setDevicesLimit] = useState(3);
  const [fileSizeVal, setFileSizeVal] = useState(50);
  const [fileSizeUnit, setFileSizeUnit] = useState("MB");

  // Owner Plan settings
  const [category, setCategory] = useState("Professional");
  const [maxStorageVal, setMaxStorageVal] = useState(100);
  const [maxStorageUnit, setMaxStorageUnit] = useState("MB");
  const [price, setPrice] = useState(100);
  const [currency, setCurrency] = useState("INR");
  const [period, setPeriod] = useState("Monthly");

  const [configError, setConfigError] = useState(null);
  const [configSuccess, setConfigSuccess] = useState(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsPaletteOpen(false);
      }
    }
    if (isOpen || isPaletteOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isPaletteOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsPaletteOpen(false);
      }
    }
    if (isOpen || isPaletteOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, isPaletteOpen]);

  const usedPercent = Math.min(100, Math.max(0, ((usedStorage / maxStorage) * 100))).toFixed(1);

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      if (onProfilePicUpload) {
        await onProfilePicUpload(e);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (ownerSettingsOpen) {
      fetchConfig();
    }
  }, [ownerSettingsOpen]);

  const fetchConfig = async () => {
    setLoadingConfig(true);
    setConfigError(null);
    try {
      const res = await fetch(`${SERVER_URL}/system-config`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDevicesLimit(data.maxDevicesLimit);

        const bytes = data.maxFileSizeLimit || 0;
        if (bytes === 0) {
          setFileSizeVal(0);
          setFileSizeUnit("B");
        } else {
          const k = 1024;
          const units = ["B", "KB", "MB", "GB", "TB"];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
          setFileSizeVal(val);
          setFileSizeUnit(units[i] || "MB");
        }
      } else {
        setConfigError("Failed to fetch system configuration.");
      }
    } catch {
      setConfigError("Network error occurred.");
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigError(null);
    setConfigSuccess(null);

    const k = 1024;
    const units = ["B", "KB", "MB", "GB", "TB"];
    const fileUnitIndex = units.indexOf(fileSizeUnit);
    const maxFileSizeBytes = Math.round(
      fileSizeVal * Math.pow(k, fileUnitIndex),
    );

    const maxStorageIndex = units.indexOf(maxStorageUnit);
    const maxStorageBytes = Math.round(
      maxStorageVal * Math.pow(k, maxStorageIndex),
    );

    try {
      const res = await fetch(`${SERVER_URL}/system-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxDevicesLimit: Number(devicesLimit),
          maxFileSizeLimit: maxFileSizeBytes,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setConfigSuccess("System settings updated successfully!");
        setTimeout(() => {
          setOwnerSettingsOpen(false);
          setConfigSuccess(null);
        }, 1500);
      } else {
        setConfigError(data.error || "Failed to update system settings.");
      }
    } catch {
      setConfigError("Network error occurred.");
    } finally {
      setSavingConfig(false);
    }

    try {
      const res = await fetch(`${SERVER_URL}/plan/create-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: category,
          amount: Number(price),
          currency,
          storage: maxStorageBytes,
          period,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setConfigSuccess("Plan settings updated successfully!");
      } else {
        setConfigError(data.error || "Failed to update Plan settings.");
      }
    } catch {
      setConfigError("Network error occurred.");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const menuItems = [
    {
      icon: User,
      label: "Account Settings",
      desc: "Profile & preferences",
      onClick: () => {
        setIsOpen(false);
        navigate("/profile");
      },
    },
    {
      icon: Sparkles,
      label: "Wally's Academy & Shortcut Config",
      desc: "Shortcuts & interactive guides",
      onClick: () => {
        setIsOpen(false);
        navigate("/dashboard/tutorials");
      },
    },
    ...(user && user.role?.toLowerCase() === "owner"
      ? [
          {
            icon: Sliders,
            label: "Owner Settings",
            desc: "Global limits & config",
            onClick: () => {
              setIsOpen(false);
              navigate("/owner/settings");
            },
          },
        ]
      : []),
    ...(user && user.role?.toLowerCase() !== "user"
      ? [
          {
            icon: Shield,
            label: "User Management",
            desc: "Control team access",
            onClick: () => {
              setIsOpen(false);
              navigate("/users");
            },
          },
        ]
      : []),
    {
      icon: CreditCard,
      label: "Billing & Plans",
      desc: "Manage subscription",
      onClick: () => {
        setIsOpen(false);
        navigate("/dashboard/billing");
      },
    },
  ];

  return (
    <div className="relative" ref={menuRef} style={{ zIndex: 9999 }}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {/* Avatar Trigger Button */}
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          setIsPaletteOpen(false);
        }}
        className="relative group focus:outline-none flex items-center gap-2"
        title="Account & Themes"
        id="profile-menu-trigger"
      >
        <div
          className={`relative flex items-center justify-center w-10 h-10 rounded-full p-[2px] transition-all duration-200 ${
            isOpen || isPaletteOpen ? "ring-2 ring-accent-primary" : "hover:scale-105"
          }`}
        >
          <div className="w-full h-full rounded-full bg-slate-100 dark:bg-vault-surface overflow-hidden flex items-center justify-center relative border border-slate-200 dark:border-white/10 shadow-sm">
            {resolvedAvatarUrl && !imgError ? (
              <img
                src={resolvedAvatarUrl}
                alt="Profile"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-black text-accent-primary select-none">
                {userInitial}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && !isPaletteOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+12px)] w-[340px] origin-top-right"
            style={{ zIndex: 9999 }}
          >
            <div className="rounded-3xl overflow-hidden bg-white/95 dark:bg-vault-surface/95 text-slate-900 dark:text-white backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]">
              {/* Header Profile Section */}
              <div className="p-5 pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3.5">
                  <div
                    className="relative group/avatar cursor-pointer shrink-0"
                    onClick={handleAvatarClick}
                  >
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-center relative shadow-sm">
                      {resolvedAvatarUrl && !imgError ? (
                        <img
                          src={resolvedAvatarUrl}
                          alt="Profile"
                          referrerPolicy="no-referrer"
                          onError={() => setImgError(true)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-black text-accent-primary select-none">
                          {userInitial}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                        {isUploading ? (
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Camera className="text-white w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {user?.name || "Vault User"}
                    </h3>
                    <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                      <ShieldCheck size={11} className="text-accent-primary" />
                      <span className="truncate max-w-[140px]">{user?.email || ""}</span>
                    </div>
                  </div>
                </div>

                {/* Storage Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                      <Cloud size={13} className="text-accent-primary" /> Cloud Storage
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {usedPercent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-primary rounded-full transition-all duration-500"
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    <span>{formatSize(usedStorage)} used</span>
                    <span>{formatSize(maxStorage)}</span>
                  </div>
                </div>
              </div>

              {/* Action Menu Items */}
              <div className="p-2 space-y-0.5">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 group-hover:text-accent-primary transition-colors">
                        <item.icon size={16} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">
                          {item.label}
                        </span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-400">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>

              {/* Quick Toolbar Bar: Dark/Light Mode, Color Palette, Fullscreen */}
              <div className="p-3 bg-slate-50 dark:bg-black/30 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleMode}
                    className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition-all text-xs flex items-center gap-1.5"
                    title="Toggle Dark/Light Mode"
                  >
                    {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                  </button>

                  <button
                    onClick={() => setIsPaletteOpen(true)}
                    className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition-all text-xs flex items-center gap-1.5"
                    title="Change Theme Accent"
                  >
                    <Palette size={15} className="text-accent-primary" />
                    <span className="text-[11px] font-bold capitalize">
                      {accent.replace("-", " ")}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                    title="Toggle Fullscreen"
                  >
                    <Maximize size={15} />
                  </button>
                </div>
              </div>

              {/* Sign Out Section */}
              <div className="p-2 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors text-left text-xs font-bold"
                  id="profile-menu-signout"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          11-COLOR THEME CUSTOMIZER DRAWER / POPOVER
          Matches the visual reference design precisely!
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isPaletteOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+12px)] w-[340px] origin-top-right"
            style={{ zIndex: 9999 }}
          >
            <div className="rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121614]/95 text-slate-900 dark:text-white backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-4.5 px-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    Color theme
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    11 curated presets in Dark & Light
                  </p>
                </div>
                <button
                  onClick={() => setIsPaletteOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Palette List */}
              <div className="p-3 space-y-1.5 overflow-y-auto custom-scrollbar flex-1">
                {palettes.map((p) => {
                  const isSelected = accent === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setAccent(p.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-150 text-left border ${
                        isSelected
                          ? "bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 shadow-sm"
                          : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Swatch Pill / Rounded Rect */}
                        <div
                          className="w-8 h-8 rounded-xl shrink-0 shadow-sm border border-black/10 dark:border-white/20"
                          style={{ backgroundColor: p.swatch }}
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.desc}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-accent-primary text-accent-foreground flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Reference Footer Toolbar */}
              <div className="p-3 bg-slate-50 dark:bg-black/40 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                {/* User quick pill */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-accent-primary">
                    {user?.name?.[0]?.toUpperCase() || "V"}
                  </div>
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold block text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                      {user?.name || "Vault"}
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      {user?.role || "Active"}
                    </span>
                  </div>
                </div>

                {/* Bottom toggles */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleMode}
                    className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition-all"
                    title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  >
                    {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      setIsPaletteOpen(false);
                      setIsOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition-all"
                    title="Account Menu"
                  >
                    <User size={14} />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                    title="Toggle Fullscreen"
                  >
                    <Maximize size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Owner Settings Modal */}
      {createPortal(
        <AnimatePresence>
          {ownerSettingsOpen && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setOwnerSettingsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                className="relative w-full max-w-lg bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden z-[10001] p-6 sm:p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent-soft text-accent-primary">
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        System Configuration
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Global parameters (Owner only)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOwnerSettingsOpen(false)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {loadingConfig ? (
                  <div className="py-12 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveConfig} className="space-y-5">
                    {configError && (
                      <div className="text-xs px-4 py-3 rounded-xl font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                        {configError}
                      </div>
                    )}
                    {configSuccess && (
                      <div className="text-xs px-4 py-3 rounded-xl font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {configSuccess}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Max Devices Limit
                        </label>
                        <input
                          type="number"
                          value={devicesLimit}
                          onChange={(e) => setDevicesLimit(e.target.value)}
                          required
                          min="1"
                          className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-accent-primary text-sm font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Max File Size Limit
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={fileSizeVal}
                            onChange={(e) => setFileSizeVal(e.target.value)}
                            required
                            min="1"
                            step="any"
                            className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-accent-primary text-sm font-semibold"
                          />
                          <select
                            value={fileSizeUnit}
                            onChange={(e) => setFileSizeUnit(e.target.value)}
                            className="bg-slate-100 dark:bg-vault-panel border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-semibold text-sm"
                          >
                            <option value="B">B</option>
                            <option value="KB">KB</option>
                            <option value="MB">MB</option>
                            <option value="GB">GB</option>
                            <option value="TB">TB</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setOwnerSettingsOpen(false)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-accent-primary text-accent-foreground hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {savingConfig ? "Saving..." : "Save Settings"}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
