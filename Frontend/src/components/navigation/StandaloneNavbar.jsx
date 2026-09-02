import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SERVER_URL } from "../../lib/api";
import { getProfilePicUrl } from "../../lib/utils";
import { VaultLogo } from "../ui/VaultIcons";
import ProfileMenu from "../ui/ProfileMenu";
import NotificationBell from "../notifications/NotificationBell";
import {
  ArrowLeft,
  HardDrive,
  User,
  Sparkles,
  Shield,
  Sliders,
  FolderLock,
  Menu,
  X,
} from "lucide-react";

export default function StandaloneNavbar() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const profilePicUrl = getProfilePicUrl(user?.profilepic);

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

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await fetch(`${SERVER_URL}/user/profilepic`, {
        method: "POST",
        headers: { filename: file.name },
        body: file,
        credentials: "include",
      });

      if (response.ok) {
        const userRes = await fetch(`${SERVER_URL}/user`, {
          credentials: "include",
        });
        if (userRes.ok) {
          const newUser = await userRes.json();
          setUser(newUser);
        }
      }
    } catch (err) {
      console.error("Error uploading profile pic", err);
    }
  };

  const userRole = user?.role?.toUpperCase() || "USER";
  const isOwner = userRole === "OWNER";
  const isManagerOrAdmin = ["OWNER", "ADMIN", "MANAGER"].includes(userRole);

  const navSections = [
    {
      name: "Vault Chamber",
      path: "/dashboard",
      icon: FolderLock,
      isPrimaryAction: true,
      exact: true,
    },
    {
      name: "Storage & Plans",
      path: "/dashboard/billing",
      aliases: ["/billing"],
      icon: HardDrive,
      accentColor: "#10B981",
    },
    {
      name: "Account Settings",
      path: "/profile",
      icon: User,
      accentColor: "#4DA6FF",
    },
    {
      name: "Wally's Academy",
      path: "/dashboard/tutorials",
      aliases: ["/tutorials"],
      icon: Sparkles,
      accentColor: "#00CFFF",
    },
    ...(isManagerOrAdmin
      ? [
          {
            name: "User Management",
            path: "/users",
            icon: Shield,
            accentColor: "#F43F5E",
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            name: "Owner Settings",
            path: "/owner/settings",
            icon: Sliders,
            accentColor: "#A855F7",
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
    <header className="h-[64px] shrink-0 bg-white/95 dark:bg-vault-surface/95 backdrop-blur-3xl border-b border-slate-200 dark:border-white/10 z-50 flex items-center justify-between px-3 sm:px-6 sticky top-0 shadow-sm transition-colors duration-200">
      {/* LEFT: Logo & Quick Return to Vault */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2.5 group"
          title="Go to Home"
        >
          <div className="bg-accent-soft border border-accent-border p-1.5 rounded-xl shadow-sm group-hover:border-accent-primary transition-colors">
            <VaultLogo className="text-accent-primary" size={18} />
          </div>
          <span className="text-base sm:text-lg font-black tracking-widest text-slate-900 dark:text-white uppercase hidden xs:inline-block">
            Vault O
          </span>
        </Link>

        {/* Back to Vault quick button */}
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs font-bold transition-all ml-1"
          title="Back to Vault files"
        >
          <ArrowLeft size={13} />
          <span className="hidden sm:inline">Back to Vault</span>
        </Link>
      </div>

      {/* CENTER: Navigation Tabs Switcher (Desktop & Tablets) */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 dark:bg-black/30 p-1 rounded-2xl border border-slate-200/80 dark:border-white/5 mx-2">
        {navSections.map((item) => {
          const active = isSectionActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                active
                  ? "bg-white dark:bg-vault-surface text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                  : "text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <Icon
                size={14}
                className={
                  active
                    ? "text-accent-primary"
                    : "text-slate-400 dark:text-white/40"
                }
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* RIGHT: Notifications, Profile & Mobile Navigation Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Navigation Dropdown Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`lg:hidden p-2 rounded-xl border transition-all ${
            mobileMenuOpen
              ? "bg-accent-soft text-accent-primary border-accent-border shadow-accent-glow-sm"
              : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
          }`}
          title="Section Navigation"
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Profile Menu */}
        <ProfileMenu
          user={user}
          profilePicUrl={profilePicUrl}
          onLogout={handleLogout}
          onLogoutAll={handleLogoutAll}
          onProfilePicUpload={handleProfilePicUpload}
        />
      </div>

      {/* MOBILE SECTION NAVIGATION OVERLAY */}
      {mobileMenuOpen && (
        <div className="absolute top-[64px] left-0 right-0 bg-white/95 dark:bg-vault-surface/95 backdrop-blur-2xl border-b border-slate-200 dark:border-white/10 shadow-2xl p-4 lg:hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-64px)] overflow-y-auto custom-scrollbar">
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
                  onClick={() => setMobileMenuOpen(false)}
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
      )}
    </header>
  );
}
