import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const navigate = useNavigate();

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
  const usedMB = 39.8;
  const totalMB = 500;
  const usedPercent = ((usedMB / totalMB) * 100).toFixed(1);

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

  const menuItems = [
    {
      icon: User,
      label: "Profile",
      onClick: () => {
        setIsOpen(false);
        navigate("/profile");
      },
    },
    ...(user && user.role !== "User"
      ? [
          {
            icon: Shield,
            label: "Users",
            onClick: () => {
              setIsOpen(false);
              navigate("/users");
            },
          },
        ]
      : []),
    {
      icon: CreditCard,
      label: "Billing",
      onClick: () => {
        setIsOpen(false);
      },
    },
    {
      icon: Tag,
      label: "Price",
      onClick: () => {
        setIsOpen(false);
      },
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

      {/* Avatar trigger */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[#14b8a6]/15 border-2 border-[#14b8a6]/30 hover:border-[#14b8a6]/60 text-[#14b8a6] font-bold overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_0_16px_rgba(20,184,166,0.35)] focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/40"
          title="Account menu"
          id="profile-menu-trigger"
        >
          {profilePicUrl ? (
            <img
              src={profilePicUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm select-none">
              {user?.name?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                "A"}
            </span>
          )}
        </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10, rotateX: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="absolute right-0 top-[calc(100%+12px)] w-[320px] origin-top-right perspective-1000"
            style={{ zIndex: 9999 }}
          >
            <div className="relative rounded-3xl overflow-hidden bg-white/90 dark:bg-[#021f17]/90 backdrop-blur-3xl border border-black/10 dark:border-teal-500/20 shadow-[0_30px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]">
              {/* Animated Top Glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-50 dark:opacity-80" />

              {/* Background ambient light */}
              <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-teal-400/20 dark:bg-teal-500/10 blur-[50px] rounded-full pointer-events-none" />

              {/* User info section */}
              <div className="px-6 pt-6 pb-5 relative z-10">
                <div className="flex items-center gap-4">
                  {/* Clickable avatar */}
                  <div
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0f463e] p-0.5 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(20,184,166,0.3)] cursor-pointer relative group transform hover:scale-105 transition-all duration-300"
                    onClick={handleAvatarClick}
                    title="Click to update profile picture"
                  >
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-white dark:bg-[#021f17] flex items-center justify-center relative">
                      {profilePicUrl ? (
                        <img
                          src={profilePicUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-teal-600 dark:text-teal-400 font-bold text-xl select-none">
                          {user?.name?.[0]?.toUpperCase() ||
                            user?.email?.[0]?.toUpperCase() ||
                            "A"}
                        </span>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                        ) : (
                          <Camera className="text-white w-5 h-5 drop-shadow-md" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="overflow-hidden flex-1 min-w-0">
                    <p className="text-base font-black text-slate-900 dark:text-white truncate tracking-tight mb-0.5">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs font-semibold text-teal-600/70 dark:text-teal-400/70 truncate flex items-center gap-1.5">
                      <ShieldCheck size={12} />
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Advanced Storage Bar */}
              <div className="px-6 py-5 bg-slate-50/50 dark:bg-black/20 border-y border-black/5 dark:border-teal-500/10 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-l from-teal-400/5 to-transparent pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Zap size={12} className="text-teal-500" />
                    Storage Status
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 tracking-wider">
                    {usedPercent}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-black/5 dark:bg-black/40 rounded-full overflow-hidden shadow-inner relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usedPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 relative"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[slide_1s_linear_infinite]" />
                  </motion.div>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 text-right">
                  {usedMB} MB / {totalMB} MB Used
                </p>
              </div>

              {/* Menu items */}
              <div className="py-3 px-3 relative z-10">
                {menuItems.map((item, idx) => (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item.label}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-teal-500/10 rounded-2xl transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-black/30 flex items-center justify-center group-hover:bg-teal-50 dark:group-hover:bg-teal-500/20 transition-colors duration-300 shadow-sm group-hover:shadow-[0_0_10px_rgba(20,184,166,0.2)]">
                      <item.icon
                        size={16}
                        className="text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-300"
                      />
                    </div>
                    <span className="group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors duration-300 relative z-10">
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Divider */}
              <div className="mx-6 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-teal-500/20 to-transparent" />

              {/* Sign out actions */}
              <div className="py-3 px-3 bg-slate-50/30 dark:bg-black/10">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all duration-300 group"
                  id="profile-menu-signout"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-black/30 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-colors duration-300">
                    <LogOut
                      size={16}
                      className="text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300"
                    />
                  </div>
                  <span>Sign Out</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogoutAll();
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all duration-300 group"
                  id="profile-menu-signout-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-black/30 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-colors duration-300">
                    <Monitor
                      size={16}
                      className="text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300"
                    />
                  </div>
                  <span>Sign Out of All Devices</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes slide {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
      `}</style>
    </div>
  );
}
