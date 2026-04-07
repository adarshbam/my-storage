import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, CreditCard, Tag, Monitor, Camera } from "lucide-react";
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
        // navigate("/dashboard/profile"); // Uncomment when you have a profile page
      },
    },
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
            crossOrigin="use-credentials"
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
      <div
        className={`absolute right-0 top-[calc(100%+8px)] w-72 origin-top-right transition-all duration-200 ease-out ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
            : "opacity-0 scale-95 pointer-events-none -translate-y-2"
        }`}
        style={{ zIndex: 9999 }}
      >
        <div className="rounded-2xl overflow-hidden bg-[#0a1f1a]/95 backdrop-blur-2xl border border-[#14b8a6]/15 shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]">
          {/* User info section */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              {/* Clickable avatar for profile pic upload */}
              <div
                className="w-11 h-11 rounded-full bg-[#14b8a6]/15 border-2 border-[#14b8a6]/25 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_12px_rgba(20,184,166,0.2)] cursor-pointer relative group"
                onClick={handleAvatarClick}
                title="Click to update profile picture"
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    crossOrigin="use-credentials"
                  />
                ) : (
                  <span className="text-[#14b8a6] font-semibold text-lg select-none">
                    {user?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "A"}
                  </span>
                )}
                {/* Hover overlay with camera icon */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-full">
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Camera className="text-white w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || ""}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#14b8a6]/20 to-transparent" />

          {/* Storage usage */}
          <div className="px-5 py-3">
            <p className="text-xs text-slate-400 mb-2">
              {usedMB} MB of {totalMB} MB used ({usedPercent}%)
            </p>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0ea5e9] transition-all duration-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#14b8a6]/20 to-transparent" />

          {/* Menu items */}
          <div className="py-1.5 px-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:bg-[#14b8a6]/10 rounded-xl transition-all duration-200 group"
              >
                <item.icon
                  size={16}
                  className="text-slate-500 group-hover:text-[#14b8a6] transition-colors duration-200"
                />
                <span className="group-hover:text-white transition-colors duration-200">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#14b8a6]/20 to-transparent" />

          {/* Sign out actions */}
          <div className="py-1.5 px-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/8 rounded-xl transition-all duration-200 group"
              id="profile-menu-signout"
            >
              <LogOut
                size={16}
                className="text-slate-500 group-hover:text-red-400 transition-colors duration-200"
              />
              <span>Sign Out</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onLogoutAll();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/8 rounded-xl transition-all duration-200 group"
              id="profile-menu-signout-all"
            >
              <Monitor
                size={16}
                className="text-slate-500 group-hover:text-red-400 transition-colors duration-200"
              />
              <span>Sign Out of All Devices</span>
            </button>
          </div>

          {/* Bottom glow accent */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-[#14b8a6]/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
