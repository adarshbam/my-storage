import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SERVER_URL } from "../../lib/api";
import {
  VaultChamberIcon,
  SecureRelayIcon,
  ActivityPulseIcon,
  PriorityBeaconIcon,
  RecycleVaultIcon,
  SystemCoreIcon,
  VaultDriveIcon,
  VaultGitIcon,
} from "../ui/VaultIcons";
import { useGoogleLogin } from "@react-oauth/google";
import { usePlan } from "../../context/PlanContext";
import { Sparkles, Unlink } from "lucide-react";
import { useChamberTransfer } from "../../context/ChamberTransferContext";
import GoogleDriveConsentModal from "../drive/GoogleDriveConsentModal";

export default function NavigationRail({ isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();
  const { user, setUser } = useAuth();
  const { hasFeature } = usePlan();
  const [isDriveConsentOpen, setIsDriveConsentOpen] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const {
    activeDragSource,
    transferDriveToVault,
    transferVaultToDrive,
    requestMoveToTrash,
  } = useChamberTransfer();
  const [dragOverTarget, setDragOverTarget] = useState(null);

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const connectDrive = useGoogleLogin({
    flow: "auth-code",
    prompt: "consent",
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/drive",
    onSuccess: async (codeResponse) => {
      try {
        setIsConnectingDrive(true);
        const res = await fetch(`${SERVER_URL}/drive/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code }),
          credentials: "include",
        });
        if (res.ok && user) {
          const newUser = { ...user };
          if (!newUser.integrations) newUser.integrations = {};
          newUser.integrations.googleDrive = { connected: true };
          setUser(newUser);
          setIsDriveConsentOpen(false);
        }
      } catch (error) {
        console.error("Drive connection error:", error);
      } finally {
        setIsConnectingDrive(false);
      }
    },
    onError: (err) => {
      console.error("Google Drive connection error:", err);
      setIsConnectingDrive(false);
    },
    onNonOAuthError: (err) => {
      console.error("Google Drive non-OAuth error:", err);
      setIsConnectingDrive(false);
      setIsDriveConsentOpen(false);
    },
  });

  const disconnectDrive = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/drive/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok && user) {
        const newUser = { ...user };
        if (newUser.integrations?.googleDrive) {
          newUser.integrations.googleDrive.connected = false;
          setUser(newUser);
        }
      }
    } catch (error) {
      console.error("Drive disconnect error:", error);
    }
  };

  const connectGithub = async () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENTID;
    const redirectUri = SERVER_URL.startsWith("http")
      ? `${SERVER_URL}/user/auth/github`
      : `${window.location.origin}${SERVER_URL}/user/auth/github`;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email,repo&state=${encodeURIComponent(`connect|${window.location.origin}`)}`;
  };

  const disconnectGithub = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/github/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok && user) {
        const newUser = { ...user };
        if (newUser.integrations?.github) {
          newUser.integrations.github.connected = false;
          setUser(newUser);
        }
      }
    } catch (error) {
      console.error("Github disconnect error:", error);
    }
  };

  // ── Feature Module Color Definitions ──
  const navItems = [
    {
      name: "Vault Chamber",
      path: "/dashboard",
      exact: true,
      icon: VaultChamberIcon,
      accentClass: "text-accent-primary",
      bgClass: "bg-accent-soft",
      shadowClass: "shadow-accent-glow-sm",
      barColor: "var(--accent-primary)",
      barGlow: "0 0 12px var(--accent-glow)",
      tourId: "nav-chamber",
    },
    {
      name: "Secure Relay",
      path: "/dashboard/shared",
      exact: false,
      icon: SecureRelayIcon,
      accentClass: "text-relay-accent",
      bgClass: "bg-relay-accent/10",
      shadowClass: "shadow-[inset_0_0_20px_rgba(155,77,255,0.2)]",
      barColor: "#C65CFF",
      barGlow: "0 0 12px rgba(155, 77, 255, 0.6)",
      tourId: "nav-relay",
    },
    {
      name: "Activity Pulse",
      path: "/dashboard/recent",
      exact: false,
      icon: ActivityPulseIcon,
      accentClass: "text-pulse-accent",
      bgClass: "bg-pulse-accent/10",
      shadowClass: "shadow-[inset_0_0_20px_rgba(0,207,255,0.2)]",
      barColor: "#00CFFF",
      barGlow: "0 0 12px rgba(0, 207, 255, 0.6)",
      tourId: "nav-pulse",
    },
    {
      name: "Priority Beacon",
      path: "/dashboard/starred",
      exact: false,
      icon: PriorityBeaconIcon,
      accentClass: "text-beacon-accent",
      bgClass: "bg-beacon-accent/10",
      shadowClass: "shadow-[inset_0_0_20px_rgba(255,209,102,0.2)]",
      barColor: "#FFD166",
      barGlow: "0 0 12px rgba(255, 209, 102, 0.6)",
      tourId: "nav-starred",
    },
    {
      name: "Recycle Vault",
      path: "/dashboard/trash",
      exact: false,
      icon: RecycleVaultIcon,
      accentClass: "text-recycle-accent",
      bgClass: "bg-recycle-accent/10",
      shadowClass: "shadow-[inset_0_0_20px_rgba(255,90,122,0.2)]",
      barColor: "#FF5A7A",
      barGlow: "0 0 12px rgba(255, 90, 122, 0.6)",
      tourId: "nav-trash",
    },
  ];

  const driveConnected = user?.integrations?.googleDrive?.connected;
  const githubConnected = user?.integrations?.github?.connected;

  // Track hovered nav item for full-color hover effect
  const [hoveredPath, setHoveredPath] = useState(null);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Navigation Rail */}
      <aside
        data-tour="nav-rail"
        className={`
        fixed md:sticky top-[64px] left-0 h-[calc(100dvh-64px)] z-40
        w-[72px] md:hover:w-[240px] group transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        bg-white/95 dark:bg-vault-surface/95 backdrop-blur-3xl border-r border-slate-200 dark:border-white/5
        flex flex-col overflow-hidden shrink-0
        ${isMobileOpen ? "translate-x-0 !w-[min(240px,calc(100vw-36px))]" : "-translate-x-full md:translate-x-0"}
      `}
      >
        {/* Main Nav Items */}
        <div className="flex-1 py-6 flex flex-col gap-1.5 px-3 overflow-y-auto overflow-x-hidden custom-scrollbar no-scrollbar">
          {navItems.map((item) => {
            const active = isActive(item.path, item.exact);
            const isChamberTarget = item.path === "/dashboard" && dragOverTarget === "chamber";
            const isTrashTarget = item.path === "/dashboard/trash" && dragOverTarget === "trash";
            const isDropActive = isChamberTarget || isTrashTarget;
            const hovered = hoveredPath === item.path && !active;
            const lit = active || hovered || isDropActive;
            const Icon = item.icon;

            const handleItemDragOver = (e) => {
              if (item.path === "/dashboard") {
                // Vault Chamber accepts ONLY Google Drive files
                const isDrive =
                  window.__activeVaultDrag?.provider === "google_drive" ||
                  activeDragSource?.provider === "google_drive" ||
                  Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-drive");

                if (!isDrive) return;

                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                setDragOverTarget("chamber");
              } else if (item.path === "/dashboard/trash") {
                // Trash accepts ONLY local Vault files (never Google Drive or external)
                const isDrive =
                  window.__activeVaultDrag?.provider === "google_drive" ||
                  activeDragSource?.provider === "google_drive" ||
                  Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-drive");

                if (isDrive) return;

                const isLocal =
                  window.__activeVaultDrag?.provider === "local" ||
                  activeDragSource?.provider === "local" ||
                  Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-local");

                if (!isLocal) return;

                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                setDragOverTarget("trash");
              }
            };

            const handleItemDragLeave = (e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                if (item.path === "/dashboard" && dragOverTarget === "chamber") {
                  setDragOverTarget(null);
                } else if (item.path === "/dashboard/trash" && dragOverTarget === "trash") {
                  setDragOverTarget(null);
                }
              }
            };

            const handleItemDrop = (e) => {
              if (item.path === "/dashboard") {
                e.preventDefault();
                e.stopPropagation();
                setDragOverTarget(null);
                const isDrive =
                  window.__activeVaultDrag?.provider === "google_drive" ||
                  activeDragSource?.provider === "google_drive" ||
                  Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-drive");

                if (!isDrive) return;

                let items = window.__activeVaultDrag?.items || activeDragSource?.items;
                if (!items || items.length === 0) {
                  try {
                    const raw = e.dataTransfer.getData("draggedItems");
                    if (raw) items = JSON.parse(raw);
                  } catch (err) {}
                }
                if (!items || items.length === 0) {
                  try {
                    const singleRaw = e.dataTransfer.getData("draggedItem");
                    if (singleRaw) items = [JSON.parse(singleRaw)];
                  } catch (err) {}
                }
                if (items && items.length > 0) {
                  transferDriveToVault(items);
                }
              } else if (item.path === "/dashboard/trash") {
                e.preventDefault();
                e.stopPropagation();
                setDragOverTarget(null);
                const isDrive =
                  window.__activeVaultDrag?.provider === "google_drive" ||
                  activeDragSource?.provider === "google_drive" ||
                  Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-drive");

                if (isDrive) return;

                let items = window.__activeVaultDrag?.items || activeDragSource?.items;
                if (!items || items.length === 0) {
                  try {
                    const raw = e.dataTransfer.getData("draggedItems");
                    if (raw) items = JSON.parse(raw);
                  } catch (err) {}
                }
                if (!items || items.length === 0) {
                  try {
                    const singleRaw = e.dataTransfer.getData("draggedItem");
                    if (singleRaw) items = [JSON.parse(singleRaw)];
                  } catch (err) {}
                }
                if (items && items.length > 0) {
                  requestMoveToTrash(items);
                }
              }
            };

            const isTrashItem = item.path === "/dashboard/trash";
            const effectiveAccentClass = active
              ? (isTrashItem ? "text-recycle-accent" : "text-accent-primary")
              : (hovered ? item.accentClass : "text-slate-400 dark:text-white/30");
            
            const effectiveBgClass = active
              ? (isTrashItem ? "bg-recycle-accent/10" : "bg-accent-soft")
              : (hovered ? item.bgClass : "");

            const effectiveShadowClass = active
              ? (isTrashItem ? item.shadowClass : "shadow-accent-glow-sm")
              : (hovered ? item.shadowClass : "");

            const effectiveBarColor = isTrashItem ? item.barColor : "var(--accent-primary)";
            const effectiveBarGlow = isTrashItem ? item.barGlow : "0 0 12px var(--accent-glow)";

            return (
              <Link
                key={item.path}
                to={item.path}
                data-tour={item.tourId}
                onClick={() => setIsMobileOpen(false)}
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
                onDragOver={handleItemDragOver}
                onDragLeave={handleItemDragLeave}
                onDrop={handleItemDrop}
                className={`
                  relative flex items-center h-12 rounded-xl overflow-hidden transition-all duration-300
                  ${
                    isChamberTarget
                      ? "ring-2 ring-accent-primary bg-accent-soft scale-[1.02] shadow-accent-glow"
                      : isTrashTarget
                      ? "ring-2 ring-rose-500 bg-rose-500/20 scale-[1.02] shadow-[0_0_20px_rgba(255,90,122,0.4)]"
                      : active
                      ? `${effectiveBgClass} ${effectiveShadowClass}`
                      : hovered
                      ? `${effectiveBgClass} ${effectiveShadowClass}`
                      : "hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                  }
                `}
              >
                {/* Active Indicator Bar — ONLY when active, not hovered */}
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                    style={{
                      backgroundColor: effectiveBarColor,
                      boxShadow: effectiveBarGlow,
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  className={`w-12 shrink-0 flex items-center justify-center transition-all duration-300 pointer-events-none ${effectiveAccentClass}`}
                  style={
                    lit ? { filter: `drop-shadow(0 0 8px currentColor)` } : {}
                  }
                >
                  <Icon
                    size={22}
                    className="transition-transform duration-300"
                  />
                </div>

                {/* Label */}
                <span
                  className={`whitespace-nowrap font-bold text-sm tracking-wide transition-all duration-300 pointer-events-none ${
                    isMobileOpen
                      ? "opacity-100"
                      : "opacity-0 md:group-hover:opacity-100"
                  } ${
                    active
                      ? `${effectiveAccentClass}`
                      : lit
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-white/40 group-hover:text-slate-800 dark:group-hover:text-white/80"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
          {/* Divider */}
          <div className="my-4 h-px bg-slate-200 dark:bg-white/5 mx-4 shrink-0" />
          <div
            className={`px-4 mb-2 text-[10px] font-bold tracking-widest text-slate-400 dark:text-white/30 uppercase transition-opacity duration-300 ${isMobileOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"}`}
          >
            Integrations
          </div>
          {/* Link Drive — Orange identity */}
          {(hasFeature("gdrive_sync") || driveConnected) && (
            <div
              className="relative flex items-center group/drive w-full"
              onDragOver={(e) => {
                if (!driveConnected) return;
                const isDrive =
                  window.__activeVaultDrag?.provider === "google_drive" ||
                  activeDragSource?.provider === "google_drive" ||
                  Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-drive");

                const isLocal =
                  !isDrive &&
                  (window.__activeVaultDrag?.provider === "local" ||
                   activeDragSource?.provider === "local" ||
                   Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-local"));

                if (isLocal) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverTarget("drive");
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  if (dragOverTarget === "drive") setDragOverTarget(null);
                }
              }}
              onDrop={(e) => {
                if (!driveConnected) return;
                e.preventDefault();
                e.stopPropagation();
                setDragOverTarget(null);
                let items = window.__activeVaultDrag?.items || activeDragSource?.items;
                if (!items || items.length === 0) {
                  try {
                    const raw = e.dataTransfer.getData("draggedItems");
                    if (raw) items = JSON.parse(raw);
                  } catch (err) {}
                }
                if (!items || items.length === 0) {
                  try {
                    const singleRaw = e.dataTransfer.getData("draggedItem");
                    if (singleRaw) items = [JSON.parse(singleRaw)];
                  } catch (err) {}
                }
                if (items && items.length > 0) {
                  transferVaultToDrive(items);
                }
              }}
            >
              {driveConnected ? (
                <Link
                  to="/dashboard/google-drive"
                  onClick={() => setIsMobileOpen(false)}
                  onMouseEnter={() => setHoveredPath("drive")}
                  onMouseLeave={() => setHoveredPath(null)}
                  onDragOver={(e) => {
                    const isDrive =
                      window.__activeVaultDrag?.provider === "google_drive" ||
                      activeDragSource?.provider === "google_drive" ||
                      Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-drive");

                    const isLocal =
                      !isDrive &&
                      (window.__activeVaultDrag?.provider === "local" ||
                       activeDragSource?.provider === "local" ||
                       Array.from(e.dataTransfer.types || []).some((t) => t.toLowerCase() === "vault/provider-local"));

                    if (isLocal) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverTarget("drive");
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      if (dragOverTarget === "drive") setDragOverTarget(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverTarget(null);
                    let items = window.__activeVaultDrag?.items || activeDragSource?.items;
                    if (!items || items.length === 0) {
                      try {
                        const raw = e.dataTransfer.getData("draggedItems");
                        if (raw) items = JSON.parse(raw);
                      } catch (err) {}
                    }
                    if (!items || items.length === 0) {
                      try {
                        const singleRaw = e.dataTransfer.getData("draggedItem");
                        if (singleRaw) items = [JSON.parse(singleRaw)];
                      } catch (err) {}
                    }
                    if (items && items.length > 0) {
                      transferVaultToDrive(items);
                    }
                  }}
                  className={`relative flex items-center h-12 w-full rounded-xl overflow-hidden text-left transition-all duration-300 ${
                    dragOverTarget === "drive"
                      ? "ring-2 ring-linkdrive-accent bg-linkdrive-accent/20 scale-[1.02] shadow-[0_0_20px_rgba(255,122,61,0.4)]"
                      : isActive("/dashboard/google-drive")
                      ? "bg-accent-soft shadow-accent-glow-sm"
                      : hoveredPath === "drive"
                      ? "bg-linkdrive-accent/10 shadow-[inset_0_0_20px_rgba(255,122,61,0.2)]"
                      : "hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {isActive("/dashboard/google-drive") && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                      style={{
                        backgroundColor: "var(--accent-primary)",
                        boxShadow: "0 0 12px var(--accent-glow)",
                      }}
                    />
                  )}
                  <div
                    className="w-12 shrink-0 flex items-center justify-center transition-all duration-300 text-linkdrive-accent pointer-events-none"
                    style={{ filter: "drop-shadow(0 0 6px rgba(255, 122, 61, 0.5))" }}
                  >
                    <VaultDriveIcon size={20} />
                  </div>
                  <span
                    className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 text-slate-900 dark:text-white/80 pointer-events-none ${
                      isMobileOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
                    }`}
                  >
                    Google Drive
                  </span>
                  {/* Subtle Disconnect Icon Button (hover-revealed) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm("Disconnect Google Drive from Vault?")) {
                        disconnectDrive();
                      }
                    }}
                    className="ml-auto mr-2.5 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover/drive:opacity-100"
                    title="Disconnect Google Drive"
                  >
                    <Unlink size={14} />
                  </button>
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-linkdrive-accent shadow-[0_0_6px_rgba(255,122,61,0.6)] group-hover/drive:opacity-0 opacity-100 transition-opacity" />
                </Link>
              ) : (
                <button
                  onClick={() => setIsDriveConsentOpen(true)}
                  onMouseEnter={() => setHoveredPath("drive")}
                  onMouseLeave={() => setHoveredPath(null)}
                  className={`relative flex items-center h-12 w-full rounded-xl overflow-hidden text-left transition-all duration-300 ${
                    hoveredPath === "drive"
                      ? "bg-linkdrive-accent/10 shadow-[inset_0_0_20px_rgba(255,122,61,0.2)]"
                      : "hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`w-12 shrink-0 flex items-center justify-center transition-all duration-300 ${
                      hoveredPath === "drive"
                        ? "text-linkdrive-accent"
                        : "text-slate-400 dark:text-white/30"
                    }`}
                    style={
                      hoveredPath === "drive"
                        ? { filter: "drop-shadow(0 0 6px rgba(255, 122, 61, 0.5))" }
                        : {}
                    }
                  >
                    <VaultDriveIcon size={20} />
                  </div>
                  <span
                    className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 ${
                      isMobileOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
                    } text-slate-500 dark:text-white/40`}
                  >
                    Link Drive
                  </span>
                </button>
              )}
            </div>
          )}
          {/* Link GitHub — Purple identity */}
          {(hasFeature("github_backup") || githubConnected) && (
            <div className="relative flex items-center group/git">
              {githubConnected ? (
                <Link
                  to="/dashboard/github"
                  onClick={() => setIsMobileOpen(false)}
                  onMouseEnter={() => setHoveredPath("github")}
                  onMouseLeave={() => setHoveredPath(null)}
                  className={`relative flex items-center h-12 w-full rounded-xl overflow-hidden text-left transition-all duration-300 ${
                    isActive("/dashboard/github")
                      ? "bg-accent-soft shadow-accent-glow-sm"
                      : hoveredPath === "github"
                      ? "bg-linkgit-accent/10 shadow-[inset_0_0_20px_rgba(198,92,255,0.2)]"
                      : "hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {isActive("/dashboard/github") && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                      style={{
                        backgroundColor: "var(--accent-primary)",
                        boxShadow: "0 0 12px var(--accent-glow)",
                      }}
                    />
                  )}
                  <div
                    className="w-12 shrink-0 flex items-center justify-center transition-all duration-300 text-linkgit-accent"
                    style={{ filter: "drop-shadow(0 0 6px rgba(198, 92, 255, 0.5))" }}
                  >
                    <VaultGitIcon size={20} />
                  </div>
                  <span
                    className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 text-slate-900 dark:text-white/80 ${
                      isMobileOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
                    }`}
                  >
                    GitHub
                  </span>
                  {/* Subtle Disconnect Icon Button (hover-revealed) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm("Disconnect GitHub from Vault?")) {
                        disconnectGithub();
                      }
                    }}
                    className="ml-auto mr-2.5 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover/git:opacity-100"
                    title="Disconnect GitHub"
                  >
                    <Unlink size={14} />
                  </button>
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-linkgit-accent shadow-[0_0_6px_rgba(198,92,255,0.6)] group-hover/git:opacity-0 opacity-100 transition-opacity" />
                </Link>
              ) : (
                <button
                  onClick={connectGithub}
                  onMouseEnter={() => setHoveredPath("github")}
                  onMouseLeave={() => setHoveredPath(null)}
                  className={`relative flex items-center h-12 w-full rounded-xl overflow-hidden text-left transition-all duration-300 ${
                    hoveredPath === "github"
                      ? "bg-linkgit-accent/10 shadow-[inset_0_0_20px_rgba(198,92,255,0.2)]"
                      : "hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`w-12 shrink-0 flex items-center justify-center transition-all duration-300 ${
                      hoveredPath === "github"
                        ? "text-linkgit-accent"
                        : "text-slate-400 dark:text-white/30"
                    }`}
                    style={
                      hoveredPath === "github"
                        ? { filter: "drop-shadow(0 0 6px rgba(198, 92, 255, 0.5))" }
                        : {}
                    }
                  >
                    <VaultGitIcon size={20} />
                  </div>
                  <span
                    className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 ${
                      isMobileOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
                    } text-slate-500 dark:text-white/40`}
                  >
                    Link GitHub
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions — System Core with Electric Blue */}
        <div className="p-3 border-t border-white/5 mt-auto bg-vault-black/50 backdrop-blur-xl shrink-0">
          <Link
            to="/profile"
            data-tour="system-core"
            onClick={() => setIsMobileOpen(false)}
            onMouseEnter={() => setHoveredPath("/profile")}
            onMouseLeave={() => setHoveredPath(null)}
            className={`relative flex items-center h-12 rounded-xl overflow-hidden transition-all duration-300 ${
              isActive("/profile")
                ? "bg-accent-soft shadow-accent-glow-sm"
                : hoveredPath === "/profile"
                ? "bg-core-accent/10 shadow-[inset_0_0_20px_rgba(77,166,255,0.15)]"
                : ""
            }`}
          >
            {isActive("/profile") && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  boxShadow: "0 0 12px var(--accent-glow)",
                }}
              />
            )}
            <div
              className={`w-12 shrink-0 flex items-center justify-center transition-all duration-300 ${
                isActive("/profile")
                  ? "text-accent-primary"
                  : hoveredPath === "/profile"
                  ? "text-core-accent"
                  : "text-white/30 group-hover:text-white/60"
              }`}
              style={
                isActive("/profile") || hoveredPath === "/profile"
                  ? { filter: "drop-shadow(0 0 8px currentColor)" }
                  : {}
              }
            >
              <SystemCoreIcon size={20} />
            </div>
            <span
              className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 ${isMobileOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"} ${
                isActive("/profile")
                  ? "text-white"
                  : "text-white/40 group-hover:text-white/80"
              }`}
            >
              System Core
            </span>
          </Link>

          {/* Wally's Academy & Shortcuts */}
          <Link
            to="/dashboard/tutorials"
            data-tour="wally-academy"
            onClick={() => setIsMobileOpen(false)}
            onMouseEnter={() => setHoveredPath("/dashboard/tutorials")}
            onMouseLeave={() => setHoveredPath(null)}
            className={`relative flex items-center h-12 rounded-xl overflow-hidden transition-all duration-300 mt-1 ${
              isActive("/dashboard/tutorials") || hoveredPath === "/dashboard/tutorials"
                ? "bg-accent-soft shadow-[inset_0_0_20px_rgba(0,207,255,0.2)]"
                : ""
            }`}
          >
            {isActive("/dashboard/tutorials") && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  boxShadow: "0 0 12px var(--accent-glow)",
                }}
              />
            )}
            <div
              className={`w-12 shrink-0 flex items-center justify-center transition-all duration-300 ${
                isActive("/dashboard/tutorials") || hoveredPath === "/dashboard/tutorials"
                  ? "text-accent-primary"
                  : "text-white/30 group-hover:text-white/60"
              }`}
              style={
                isActive("/dashboard/tutorials") || hoveredPath === "/dashboard/tutorials"
                  ? { filter: "drop-shadow(0 0 8px currentColor)" }
                  : {}
              }
            >
              <Sparkles size={20} />
            </div>
            <span
              className={`whitespace-nowrap font-medium text-sm transition-opacity duration-300 ${isMobileOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"} ${
                isActive("/dashboard/tutorials")
                  ? "text-white font-bold"
                  : "text-white/40 group-hover:text-white/80"
              }`}
            >
              Wally's Academy
            </span>
          </Link>
        </div>
      </aside>

      {/* Mandatory In-App Google Drive Permissions & Compliance Consent Modal */}
      <GoogleDriveConsentModal
        isOpen={isDriveConsentOpen}
        onClose={() => setIsDriveConsentOpen(false)}
        onConfirm={connectDrive}
        isConnecting={isConnectingDrive}
      />
    </>
  );
}
