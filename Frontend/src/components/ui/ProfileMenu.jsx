import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  User,
  CreditCard,
  Tag,
  Monitor,
  Camera,
  ShieldCheck,
  Zap,
  Shield,
  Settings,
  ChevronRight,
  HardDrive,
  Cloud,
  X,
  Sliders,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatSize } from "../../lib/utils";
import { SERVER_URL } from "../../lib/api";

export default function ProfileMenu({
  user,
  profilePicUrl,
  onLogout,
  onLogoutAll,
  onProfilePicUpload,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const maxStorage = user.maxStorage || 1024 * 1024 * 500;
  const usedStorage = user.usedStorage || 0;
  const navigate = useNavigate();

  // Owner settings state
  const [ownerSettingsOpen, setOwnerSettingsOpen] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [devicesLimit, setDevicesLimit] = useState(3);
  const [fileSizeVal, setFileSizeVal] = useState(50);
  const [fileSizeUnit, setFileSizeUnit] = useState("MB");
  const [configError, setConfigError] = useState(null);
  const [configSuccess, setConfigSuccess] = useState(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Simulated storage data (you can wire this to a real endpoint later)
  const usedPercent = ((usedStorage / maxStorage) * 100).toFixed(1);

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
      // Reset input so re-uploading same file works
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
          setFileSizeUnit(units[i]);
        }
      } else {
        setConfigError("Failed to fetch system configuration.");
      }
    } catch (err) {
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
    const unitIndex = units.indexOf(fileSizeUnit);
    const bytes = Math.round(fileSizeVal * Math.pow(k, unitIndex));

    try {
      const res = await fetch(`${SERVER_URL}/system-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxDevicesLimit: devicesLimit,
          maxFileSizeLimit: bytes,
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
    } catch (err) {
      setConfigError("Network error occurred.");
    } finally {
      setSavingConfig(false);
    }
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
      gradient: "from-blue-500 to-indigo-500",
    },
    ...(user && user.role?.toLowerCase() === "owner"
      ? [
          {
            icon: Sliders,
            label: "Owner Settings",
            desc: "Global limits & config",
            onClick: () => {
              setIsOpen(false);
              setOwnerSettingsOpen(true);
            },
            gradient: "from-purple-500 to-indigo-500",
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
            gradient: "from-emerald-500 to-teal-500",
          },
        ]
      : []),
    {
      icon: CreditCard,
      label: "Billing & Plans",
      desc: "Manage subscription",
      onClick: () => {
        setIsOpen(false);
      },
      gradient: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="relative" ref={menuRef} style={{ zIndex: 9999 }}>
      {/* Hidden file input for profile pic upload */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {/* Modern Avatar Trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative group focus:outline-none"
        title="Account menu"
        id="profile-menu-trigger"
      >
        <div className="absolute inset-[-4px] bg-gradient-to-r from-[#14b8a6] via-[#3b82f6] to-[#8b5cf6] rounded-full blur-[6px] opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
        <div
          className={`relative flex items-center justify-center w-11 h-11 rounded-full p-[2px] transition-transform duration-300 ${isOpen ? "scale-95" : "hover:scale-105"}`}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#14b8a6] to-[#3b82f6] rounded-full [mask-image:linear-gradient(white,transparent)]" />
          <div className="w-full h-full rounded-full bg-white dark:bg-[#020b08] overflow-hidden flex items-center justify-center relative z-10 border-2 border-white/50 dark:border-white/10 shadow-sm">
            {profilePicUrl ? (
              <img
                src={profilePicUrl}
                alt="Profile"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] select-none">
                {user?.name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "A"}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Stunning Floating Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: 10, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-[calc(100%+16px)] w-[380px] origin-top-right perspective-1000"
            style={{ zIndex: 9999 }}
          >
            <div className="relative rounded-[2rem] overflow-hidden bg-white/60 dark:bg-[#020b08]/80 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
              {/* Internal ambient glowing blobs */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#14b8a6]/20 dark:bg-[#14b8a6]/15 rounded-full blur-[50px] pointer-events-none" />
              <div className="absolute top-1/2 -left-24 w-48 h-48 bg-[#3b82f6]/15 dark:bg-[#3b82f6]/10 rounded-full blur-[50px] pointer-events-none" />

              {/* Premium Header Profile Section */}
              <div className="relative p-6 pb-5">
                <div className="flex items-center gap-5">
                  <div
                    className="relative group/avatar cursor-pointer shrink-0"
                    onClick={handleAvatarClick}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] rounded-[1.25rem] blur-md opacity-40 group-hover/avatar:opacity-80 transition-opacity duration-300" />
                    <div className="relative w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-white to-slate-50 dark:from-[#0f172a] dark:to-[#020b08] p-[2px] shadow-xl">
                      <div className="w-full h-full rounded-[1.1rem] overflow-hidden bg-white dark:bg-[#020b08] flex items-center justify-center relative">
                        {profilePicUrl ? (
                          <img
                            src={profilePicUrl}
                            alt="Profile"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110"
                          />
                        ) : (
                          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] select-none">
                            {user?.name?.[0]?.toUpperCase() ||
                              user?.email?.[0]?.toUpperCase() ||
                              "A"}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300">
                          {isUploading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Camera className="text-white w-6 h-6 transform scale-75 group-hover/avatar:scale-100 transition-transform duration-300 drop-shadow-lg" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white truncate tracking-tight mb-1">
                      {user?.name || "User"}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 w-fit">
                      <ShieldCheck size={12} className="text-[#14b8a6]" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Storage Widget */}
              <div className="px-6 py-4 mx-4 mb-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/60 dark:border-white/5 relative overflow-hidden group/storage">
                <div className="absolute inset-0 bg-gradient-to-r from-[#14b8a6]/0 via-[#14b8a6]/5 to-[#3b82f6]/5 opacity-0 group-hover/storage:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#14b8a6]/10 text-[#14b8a6]">
                        <Cloud size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Cloud Storage
                      </span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 tracking-wider shadow-sm">
                      {usedPercent}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${usedPercent}%` }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] w-full h-full animate-[shimmer_2s_infinite]" />
                    </motion.div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="text-slate-800 dark:text-slate-200">
                        {formatSize(usedStorage)}
                      </span>{" "}
                      used
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      {formatSize(maxStorage)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Menu Items */}
              <div className="px-4 pb-2 space-y-1 relative z-10">
                {menuItems.map((item, idx) => (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-[14px] flex items-center justify-center bg-gradient-to-br ${item.gradient} bg-opacity-10 dark:bg-opacity-20 shadow-sm relative overflow-hidden`}
                      >
                        <div className="absolute inset-0 bg-white/90 dark:bg-[#020b08]/80 m-[1px] rounded-[13px] z-0 transition-colors group-hover:bg-white/40 dark:group-hover:bg-[#020b08]/40" />
                        <item.icon
                          size={18}
                          className="relative z-10 text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="text-left">
                        <span className="block text-sm font-bold text-slate-800 dark:text-white mb-0.5 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-800 group-hover:to-slate-500 dark:group-hover:from-white dark:group-hover:to-slate-300 transition-colors">
                          {item.label}
                        </span>
                        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <ChevronRight
                        size={14}
                        className="text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent my-2" />

              {/* Sign Out Section */}
              <div className="p-4 pt-2 space-y-1 relative z-10">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300 group"
                  id="profile-menu-signout"
                >
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                    <LogOut size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    Sign Out
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogoutAll();
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-300 group"
                  id="profile-menu-signout-all"
                >
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform duration-300">
                    <Monitor size={18} className="group-hover:animate-pulse" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      Sign Out All Devices
                    </span>
                    <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Terminate all active sessions
                    </span>
                  </div>
                </button>
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
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setOwnerSettingsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#0a0a0f] border border-purple-500/20 rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(139,92,246,0.3)] overflow-hidden z-[10001] p-8"
              >
                {/* Glow effects */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />

                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">
                        System Limits
                      </h3>
                      <p className="text-xs text-gray-400">
                        Configure global parameters (Owner Only)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOwnerSettingsOpen(false)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {loadingConfig ? (
                  <div className="py-12 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSaveConfig}
                    className="space-y-6 relative z-10"
                  >
                    {configError && (
                      <div className="text-sm px-4 py-3 rounded-xl font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        {configError}
                      </div>
                    )}
                    {configSuccess && (
                      <div className="text-sm px-4 py-3 rounded-xl font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {configSuccess}
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Devices Limit */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Max Connected Devices Limit
                        </label>
                        <input
                          type="number"
                          value={devicesLimit}
                          onChange={(e) => setDevicesLimit(e.target.value)}
                          required
                          min="1"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-semibold"
                          placeholder="e.g. 3"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                          The maximum number of concurrent device sessions
                          allowed per user.
                        </p>
                      </div>

                      {/* Max File Size Limit */}
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Max Upload File Size
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={fileSizeVal}
                            onChange={(e) => setFileSizeVal(e.target.value)}
                            required
                            min="1"
                            step="any"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-semibold"
                            placeholder="e.g. 50"
                          />
                          <select
                            value={fileSizeUnit}
                            onChange={(e) => setFileSizeUnit(e.target.value)}
                            className="bg-[#101014] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 font-semibold"
                          >
                            <option value="B">Bytes (B)</option>
                            <option value="KB">Kilobytes (KB)</option>
                            <option value="MB">Megabytes (MB)</option>
                            <option value="GB">Gigabytes (GB)</option>
                            <option value="TB">Terabytes (TB)</option>
                          </select>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Maximum file size allowed for uploading. Stored on
                          backend in bytes.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setOwnerSettingsOpen(false)}
                        className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="px-6 py-3 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50"
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

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
