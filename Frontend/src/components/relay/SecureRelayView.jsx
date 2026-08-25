import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Share2,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
  Lock,
  Globe,
  Clock,
  Shield,
  FolderOpen,
  User,
  Loader2,
  X,
  ChevronDown,
  Sparkles,
  Layers,
  FileText,
  ExternalLink,
  ShieldAlert,
  Download,
  MoreVertical,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Link2,
  Eye,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import SharedLinkCard from "./SharedLinkCard";
import SharedLinkRow from "./SharedLinkRow";
import EditLinkModal from "./EditLinkModal";
import LinkQRCodeModal from "./LinkQRCodeModal";
import AccessSharedLinkModal from "./AccessSharedLinkModal";
import Skeleton from "../ui/Skeleton";
import Button from "../ui/Button";
import { usePlan } from "../../context/PlanContext";
import { formatSize, getProfilePicUrl, getInitials } from "../../lib/utils";

const FilePreviewModal = lazy(() => import("../drive/FilePreviewModal"));

// Demo/Dummy incoming shared vaults for realistic preview when user has no incoming invites yet
const DEMO_INCOMING_DRIVES = [
  {
    _id: "demo-drive-1",
    isDemo: true,
    userId: {
      _id: "demo-user-1",
      name: "Sarah Connor",
      email: "sarah.connor@cyberdyne.io",
      profilepic: null,
    },
    name: "Design System & Assets",
    permission: ["read"],
    itemCount: 8,
    size: 14889779, // ~14.2 MB
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: "demo-f-1", name: "UI_Mockups_2026.fig", type: "file", size: 8400000 },
      { id: "demo-f-2", name: "Brand_Identity_Guide.pdf", type: "file", size: 4200000 },
      { id: "demo-f-3", name: "Icons_Export.zip", type: "file", size: 2289779 },
    ],
  },
  {
    _id: "demo-drive-2",
    isDemo: true,
    userId: {
      _id: "demo-user-2",
      name: "Alex Vance",
      email: "alex.vance@blackmesa.org",
      profilepic: null,
    },
    name: "Quantum Engine Core",
    permission: ["write"],
    itemCount: 12,
    size: 3984588, // ~3.8 MB
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: "demo-f-4", name: "teleport_protocol.cpp", type: "file", size: 120400 },
      { id: "demo-f-5", name: "graviton_matrices.json", type: "file", size: 864188 },
      { id: "demo-f-6", name: "build_instructions.md", type: "file", size: 45000 },
    ],
  },
  {
    _id: "demo-drive-3",
    isDemo: true,
    userId: {
      _id: "demo-user-3",
      name: "Elena Rostova",
      email: "elena.rostova@cipher.net",
      profilepic: null,
    },
    name: "Elena's Full Vault Node",
    permission: ["owner"],
    itemCount: 24,
    size: 134637158, // ~128.4 MB
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    items: [], // Full vault node
  },
];

export default function SecureRelayView({ openShareModal }) {
  const navigate = useNavigate();
  const { hasFeature, isNoPlan } = usePlan();

  // Active Main Tab: "outgoing" (Your Shared Links) or "incoming" (Shared With Me)
  const [activeTab, setActiveTab] = useState("outgoing");

  // Outgoing Links State
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

  // Incoming Shared Drives State
  const [incomingDrives, setIncomingDrives] = useState([]);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [showDemoIncoming, setShowDemoIncoming] = useState(true);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // For outgoing: "all", "active", "protected", "expired"
  const [incomingFilter, setIncomingFilter] = useState("all"); // For incoming: "all", "read", "write", "owner"
  const [sortBy, setSortBy] = useState("recent"); // "recent", "oldest", "views", "downloads", "name", "size"
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // Modals state
  const [editingLink, setEditingLink] = useState(null);
  const [qrModalData, setQrModalData] = useState(null); // { url, title }
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [activeDrivePreview, setActiveDrivePreview] = useState(null);
  const [previewingFile, setPreviewingFile] = useState(null);
  const [planUpgradeModal, setPlanUpgradeModal] = useState(null);

  useEffect(() => {
    fetchOutgoingLinks();
    fetchIncomingDrives();
  }, []);

  const fetchOutgoingLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await fetch(`${SERVER_URL}/share/links`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (err) {
      console.error("Failed to fetch share links:", err);
    } finally {
      setLoadingLinks(false);
    }
  };

  const fetchIncomingDrives = async () => {
    setLoadingIncoming(true);
    try {
      const res = await fetch(`${SERVER_URL}/share/drives`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setIncomingDrives(data.sharedAccesses || []);
      }
    } catch (err) {
      console.error("Failed to fetch shared drives:", err);
    } finally {
      setLoadingIncoming(false);
    }
  };

  const refreshCurrentTab = () => {
    if (activeTab === "outgoing") {
      fetchOutgoingLinks();
    } else {
      fetchIncomingDrives();
    }
  };

  const handleToggleActive = async (linkId) => {
    try {
      const res = await fetch(`${SERVER_URL}/share/link/${linkId}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLinks((prev) =>
          prev.map((l) => (l._id === linkId ? { ...l, isActive: data.isActive } : l))
        );
      }
    } catch (err) {
      console.error("Failed to toggle link active state:", err);
    }
  };

  const handleRevokeLink = async (linkId) => {
    if (
      !window.confirm(
        "Are you sure you want to revoke and delete this share link? External users will immediately lose access."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${SERVER_URL}/share/link/${linkId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l._id !== linkId));
      }
    } catch (err) {
      console.error("Failed to revoke share link:", err);
    }
  };

  const handleLinkUpdated = (updatedLink) => {
    setLinks((prev) =>
      prev.map((l) => (l._id === updatedLink._id ? { ...l, ...updatedLink } : l))
    );
  };

  // Filter and sort outgoing links (Robust case-insensitive search for files, titles, vault node, tokens)
  const filteredLinks = useMemo(() => {
    const now = new Date();
    return links
      .filter((link) => {
        // Status filter
        const isExpired = link.isExpired || (link.expiresAt && new Date(link.expiresAt) < now);
        if (statusFilter === "active" && (!link.isActive || isExpired)) return false;
        if (statusFilter === "protected" && !link.hasPassword && link.accessType !== "restricted") return false;
        if (statusFilter === "expired" && !isExpired) return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const isVaultNode = !link.items || link.items.length === 0;
          const isMulti = link.items && link.items.length > 1;
          const computedDisplayName = link.title || (
            isMulti
              ? `${link.items[0].name} +${link.items.length - 1} more`
              : link.items?.[0]?.name || "Entire Vault Node"
          );

          const nameMatch = computedDisplayName.toLowerCase().includes(q);
          const titleMatch = (link.title || "").toLowerCase().includes(q);
          const itemMatch = (link.items || []).some((item) =>
            (item.name || "").toLowerCase().includes(q) ||
            (item.extension || "").toLowerCase().includes(q)
          );
          const tokenMatch = (link.token || "").toLowerCase().includes(q);
          const vaultMatch = isVaultNode && (
            "entire vault node".includes(q) ||
            "vault".includes(q) ||
            "node".includes(q) ||
            "entire".includes(q)
          );
          const permissionMatch = (link.permission || []).some((p) =>
            p.toLowerCase().includes(q)
          );
          const accessTypeMatch = (link.accessType || "").toLowerCase().includes(q);

          if (!nameMatch && !titleMatch && !itemMatch && !tokenMatch && !vaultMatch && !permissionMatch && !accessTypeMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === "views") {
          return (b.views || 0) - (a.views || 0);
        }
        if (sortBy === "downloads") {
          return (b.downloads || 0) - (a.downloads || 0);
        }
        if (sortBy === "name") {
          const nameA = a.title || (a.items?.[0]?.name || "Entire Vault Node");
          const nameB = b.title || (b.items?.[0]?.name || "Entire Vault Node");
          return nameA.localeCompare(nameB);
        }
        if (sortBy === "size") {
          const sizeA = (a.items && a.items.length > 0)
            ? a.items.reduce((acc, c) => acc + (c.size || 0), 0)
            : (a.size || a.vaultSize || 0);
          const sizeB = (b.items && b.items.length > 0)
            ? b.items.reduce((acc, c) => acc + (c.size || 0), 0)
            : (b.size || b.vaultSize || 0);
          return sizeB - sizeA;
        }
        return 0;
      });
  }, [links, statusFilter, searchQuery, sortBy]);

  // Filter and sort incoming shared drives
  const effectiveIncomingDrives = useMemo(() => {
    if (incomingDrives.length > 0) return incomingDrives;
    return showDemoIncoming ? DEMO_INCOMING_DRIVES : [];
  }, [incomingDrives, showDemoIncoming]);

  const filteredIncomingDrives = useMemo(() => {
    return effectiveIncomingDrives
      .filter((access) => {
        const owner = access.userId || {};
        const permission = (access.permission && access.permission[0]) || "read";

        // Clearance filter
        if (incomingFilter === "read" && permission !== "read") return false;
        if (incomingFilter === "write" && permission !== "write") return false;
        if (incomingFilter === "owner" && permission !== "owner") return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const ownerName = (owner.name || "").toLowerCase();
          const ownerEmail = (owner.email || "").toLowerCase();
          const resourceName = (access.name || (access.items?.length === 0 ? `${owner.name}'s Vault Node` : "Shared Items")).toLowerCase();
          const itemMatch = (access.items || []).some((item) =>
            (item.name || "").toLowerCase().includes(q)
          );
          const permMatch = permission.toLowerCase().includes(q);

          if (!ownerName.includes(q) && !ownerEmail.includes(q) && !resourceName.includes(q) && !itemMatch && !permMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === "name") {
          const nameA = a.name || a.userId?.name || "";
          const nameB = b.name || b.userId?.name || "";
          return nameA.localeCompare(nameB);
        }
        if (sortBy === "size") {
          return (b.size || 0) - (a.size || 0);
        }
        return 0;
      });
  }, [effectiveIncomingDrives, incomingFilter, searchQuery, sortBy]);

  const sortLabels = {
    recent: "Most Recent",
    oldest: "Oldest First",
    views: "Most Viewed",
    downloads: "Most Downloaded",
    name: "Name (A-Z)",
    size: "File Size",
  };

  const handleOpenIncomingDrive = (access) => {
    const isFullAdmin = (access.permission || []).includes("owner");
    const hasGithub = (access.items || []).some((i) => i.provider === "github");
    const hasGdrive = (access.items || []).some((i) => i.provider === "google_drive" || i.provider === "drive");
    const hasDropbox = (access.items || []).some((i) => i.provider === "dropbox");

    if (isFullAdmin && isNoPlan) {
      setPlanUpgradeModal({
        title: "Storage Subscription Required",
        message: "Full Admin shared vaults require an active storage subscription. Upgrade your plan to use administrative permissions and access this vault.",
      });
      return;
    }

    if (hasGithub && (isNoPlan || !hasFeature("github_backup"))) {
      setPlanUpgradeModal({
        title: "Professional Plan Required",
        message: "Accessing shared GitHub repositories requires a Professional or Ultimate storage plan. Upgrade to unlock external repository integration.",
      });
      return;
    }

    if (hasGdrive && (isNoPlan || !hasFeature("gdrive_sync"))) {
      setPlanUpgradeModal({
        title: "Professional Plan Required",
        message: "Accessing shared Google Drive assets requires a Professional or Ultimate storage plan. Upgrade to unlock external cloud drive integration.",
      });
      return;
    }

    if (hasDropbox && (isNoPlan || !hasFeature("dropbox_sync"))) {
      setPlanUpgradeModal({
        title: "Professional Plan Required",
        message: "Accessing shared Dropbox assets requires a Professional or Ultimate storage plan. Upgrade to unlock external cloud drive integration.",
      });
      return;
    }

    if (access.isDemo) {
      setActiveDrivePreview(access);
      return;
    }

    const owner = access.userId;
    const isFullVault = !access.items || access.items.length === 0;

    if (isFullVault && owner?.rootDirId) {
      navigate(`/dashboard/shared/folder/${owner.rootDirId}`);
      return;
    }

    if (access.items && access.items.length === 1 && access.items[0].type === "directory") {
      navigate(`/dashboard/shared/folder/${access.items[0].id}`);
      return;
    }

    // For file-only drives, multiple items, or mixed drives, open the Drive Preview modal
    setActiveDrivePreview(access);
  };

  const currentCount = activeTab === "outgoing" ? filteredLinks.length : filteredIncomingDrives.length;
  const currentTotal = activeTab === "outgoing" ? links.length : effectiveIncomingDrives.length;

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 pb-20">
      
      {/* ── Header Section (Matching Design Reference) ── */}
      <div className="bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-white/5 rounded-3xl p-6 sm:p-7 shadow-sm text-slate-900 dark:text-white">
        
        {/* Top Tag & Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {/* LINK MANAGEMENT / INCOMING RELAYS BADGE */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-2 shadow-sm ${
              activeTab === "outgoing"
                ? "bg-relay-accent/10 border border-relay-accent/20 text-relay-accent"
                : "bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400"
            }`}>
              <Share2 size={13} />
              <span>{activeTab === "outgoing" ? "Link Management" : "Incoming Relays"}</span>
            </div>

            {/* Title & Count */}
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {activeTab === "outgoing" ? "Your Shared Links" : "Shared With You"}
              </h1>
              <span className="text-sm font-semibold text-slate-400 dark:text-white/40 font-mono">
                {loadingLinks || loadingIncoming ? "..." : `${currentCount} items`}
              </span>
            </div>
          </div>

          {/* Tab Switcher: Your Shared Links vs Shared With Me */}
          <div className="flex items-center bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-1 shrink-0">
            <button
              onClick={() => {
                setActiveTab("outgoing");
                setSearchQuery("");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "outgoing"
                  ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                  : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Shared Links</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "outgoing" ? "bg-black/20 text-current" : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/60"
              }`}>
                {links.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("incoming");
                setSearchQuery("");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "incoming"
                  ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                  : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Shared With Me</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "incoming" ? "bg-black/20 text-current" : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/60"
              }`}>
                {effectiveIncomingDrives.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Quick Refresh Button */}
            <button
              onClick={refreshCurrentTab}
              disabled={loadingLinks || loadingIncoming}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-vault-surface border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95 disabled:opacity-40"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={(loadingLinks || loadingIncoming) ? "animate-spin" : ""} />
            </button>

            {/* Access via Link Button */}
            <Button
              onClick={() => setAccessModalOpen(true)}
              variant="secondary"
              className="py-2.5 px-3.5 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 bg-slate-100 dark:bg-vault-surface hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-sm"
              title="Open or connect a shared relay link"
            >
              <Link2 size={14} className="text-accent-primary" />
              <span>Access via Link</span>
            </Button>

            {/* Create Link CTA */}
            {activeTab === "outgoing" && (
              <Button
                onClick={() => openShareModal && openShareModal([])}
                className="flex-1 sm:flex-initial py-2.5 px-4 text-xs font-bold shadow-accent-glow flex items-center justify-center gap-2 shrink-0"
              >
                <Plus size={15} />
                <span>New Link</span>
              </Button>
            )}
          </div>
        </div>
      </div>

        {/* ── Controls Row: Search + Status/Clearance Filter Pills + Sort + View Switch (Active on BOTH tabs) ── */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-3xl p-3 sm:p-4 shadow-sm backdrop-blur-xl">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "outgoing" ? "Search files, links, or tokens..." : "Search shared vaults, owners, or files..."}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/30 rounded-2xl text-xs sm:text-sm focus:border-accent-primary focus:ring-1 focus:ring-accent-border/30 outline-none transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills, Sort Dropdown & View Mode */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            
            {/* Filter Pills Group for Outgoing Links */}
            {activeTab === "outgoing" ? (
              <div className="flex items-center bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "all"
                      ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                      : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All Links
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "active"
                      ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                      : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("protected")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "protected"
                      ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                      : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Protected
                </button>
                <button
                  onClick={() => setStatusFilter("expired")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "expired"
                      ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                      : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Expired
                </button>
              </div>
            ) : (
              /* Filter Pills Group for Incoming Shared Drives */
              <div className="flex items-center bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-1">
                <button
                  onClick={() => setIncomingFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    incomingFilter === "all"
                      ? "bg-accent-primary text-accent-foreground shadow-accent-glow-sm"
                      : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All Relays
                </button>
                <button
                  onClick={() => setIncomingFilter("read")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    incomingFilter === "read"
                      ? "bg-document-accent text-black shadow-[0_0_12px_rgba(0,207,255,0.3)]"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Read Only
                </button>
                <button
                  onClick={() => setIncomingFilter("write")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    incomingFilter === "write"
                      ? "bg-media-accent text-black shadow-[0_0_12px_rgba(255,122,61,0.3)]"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Read & Write
                </button>
                <button
                  onClick={() => setIncomingFilter("owner")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    incomingFilter === "owner"
                      ? "bg-danger-accent text-white shadow-[0_0_12px_rgba(255,90,122,0.3)]"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Full Admin
                </button>
              </div>
            )}
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-black/60 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-all shadow-sm"
              >
                <ArrowUpDown size={13} className="text-accent-primary" />
                <span>{sortLabels[sortBy] || "Sort"}</span>
                <ChevronDown size={13} className="text-slate-400 dark:text-white/40" />
              </button>

              {sortDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setSortDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-30 w-44 bg-white dark:bg-vault-panel/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-0.5 animate-fade-in text-slate-900 dark:text-white">
                    {Object.entries(sortLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setSortDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-xs font-medium rounded-xl text-left transition-colors ${
                          sortBy === key
                            ? "bg-accent-soft text-accent-primary font-bold"
                            : "text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Grid / List View Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "list"
                    ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="List view"
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

      {/* ── Main Content Area ── */}
      {activeTab === "outgoing" ? (
        <div>
          {loadingLinks ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-vault-surface/60 border border-white/5 rounded-3xl p-5 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="w-32 h-4 rounded" />
                      <Skeleton className="w-20 h-3 rounded" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="w-16 h-5 rounded-full" />
                    <Skeleton className="w-20 h-5 rounded-full" />
                  </div>
                  <div className="pt-3 border-t border-white/5 flex gap-2">
                    <Skeleton className="flex-1 h-9 rounded-xl" />
                    <Skeleton className="w-9 h-9 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLinks.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center text-center p-12 bg-white/60 dark:bg-vault-surface/40 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-accent-soft text-accent-primary border border-accent-border flex items-center justify-center shadow-accent-glow-sm">
                <Share2 size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {searchQuery || statusFilter !== "all"
                    ? "No matching share links found"
                    : "No Share Links Generated Yet"}
                </h3>
                <p className="text-xs sm:text-sm text-white/40 max-w-md mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "Try searching by file name, link title, 'vault', or adjusting your filters."
                    : "Create secure encrypted share links for your files, folders, or entire vault nodes."}
                </p>
              </div>

              <Button
                onClick={() => openShareModal && openShareModal([])}
                className="mt-2 py-2.5 px-6 rounded-2xl flex items-center gap-2 text-xs"
              >
                <Plus size={16} />
                Create New Share Link
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLinks.map((link) => (
                <SharedLinkCard
                  key={link._id}
                  link={link}
                  onToggleActive={handleToggleActive}
                  onEdit={(l) => setEditingLink(l)}
                  onShowQR={(url, title) => setQrModalData({ url, title })}
                  onRevoke={handleRevokeLink}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2.5">
              {filteredLinks.map((link) => (
                <SharedLinkRow
                  key={link._id}
                  link={link}
                  onToggleActive={handleToggleActive}
                  onEdit={(l) => setEditingLink(l)}
                  onShowQR={(url, title) => setQrModalData({ url, title })}
                  onRevoke={handleRevokeLink}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Incoming Shared Drives ("Shared With Me") ── */
        <div>
          {/* Demo Notice Banner if using demo drives */}
          {incomingDrives.length === 0 && showDemoIncoming && (
            <div className="mb-5 p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-purple-300">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-purple-400 shrink-0" />
                <span>
                  <strong>Demo Incoming Relays Active:</strong> Sample shared vaults are displayed below to let you preview and test search, filters, permissions, and browsing.
                </span>
              </div>
              <button
                onClick={() => setShowDemoIncoming(false)}
                className="text-white/40 hover:text-white text-[11px] underline shrink-0"
              >
                Hide Demos
              </button>
            </div>
          )}

          {loadingIncoming ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-vault-surface/60 border border-white/5 rounded-3xl p-5 space-y-4"
                >
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <Skeleton className="w-36 h-5 rounded" />
                  <Skeleton className="w-24 h-4 rounded" />
                </div>
              ))}
            </div>
          ) : filteredIncomingDrives.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-vault-surface/40 border border-dashed border-white/10 rounded-3xl space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <FolderOpen size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {searchQuery || incomingFilter !== "all"
                    ? "No matching incoming shared relays found"
                    : "No Incoming Shared Access"}
                </h3>
                <p className="text-xs sm:text-sm text-white/40 max-w-md mx-auto">
                  {searchQuery || incomingFilter !== "all"
                    ? "Try adjusting your search terms or clearance filter."
                    : "Vault nodes and directories shared with you by other users will appear here once authenticated."}
                </p>
              </div>

              {!showDemoIncoming && (
                <Button
                  onClick={() => setShowDemoIncoming(true)}
                  className="mt-2 py-2 px-5 rounded-2xl text-xs flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  Load Sample Shared Vaults
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* Incoming Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredIncomingDrives.map((access) => {
                const owner = access.userId || {};
                const isFullVault = !access.items || access.items.length === 0;
                const permission = (access.permission && access.permission[0]) || "read";
                const displayName = access.name || (isFullVault ? `${owner.name || "Owner"}'s Vault Node` : `${owner.name || "Owner"}'s Shared Items`);
                const formattedSize = access.size ? formatSize(access.size) : "0 B";
                const dateStr = access.createdAt
                  ? new Date(access.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recent";

                return (
                  <div
                    key={access._id}
                    className="bg-vault-surface/90 hover:bg-vault-surface border border-white/5 hover:border-purple-500/30 rounded-3xl p-5 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(168,85,247,0.12)] flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Row: Icon & Clearance Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                          {isFullVault ? <Layers size={22} /> : <FolderOpen size={22} />}
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {access.isDemo && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 text-purple-300 border border-purple-500/20">
                              DEMO
                            </span>
                          )}
                          {(() => {
                            const isFullAdmin = permission === "owner";
                            const hasGithub = (access.items || []).some((i) => i.provider === "github");
                            const hasGdrive = (access.items || []).some((i) => i.provider === "google_drive" || i.provider === "drive");
                            const hasDropbox = (access.items || []).some((i) => i.provider === "dropbox");
                            const isFullAdminBlocked = isFullAdmin && isNoPlan;
                            const isExternalBlocked =
                              (hasGithub && (isNoPlan || !hasFeature("github_backup"))) ||
                              (hasGdrive && (isNoPlan || !hasFeature("gdrive_sync"))) ||
                              (hasDropbox && (isNoPlan || !hasFeature("dropbox_sync")));

                            if (isFullAdminBlocked) {
                              return (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                                  <Lock size={10} /> Full Admin
                                </span>
                              );
                            }
                            if (isExternalBlocked) {
                              return (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                                  <Lock size={10} /> Pro Plan Req
                                </span>
                              );
                            }
                            return (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  permission === "owner"
                                    ? "bg-danger-accent/15 text-danger-accent border border-danger-accent/25"
                                    : permission === "write"
                                    ? "bg-media-accent/15 text-media-accent border border-media-accent/25"
                                    : "bg-document-accent/15 text-document-accent border border-document-accent/25"
                                }`}
                              >
                                {permission === "owner" ? "Full Admin" : permission === "write" ? "Read & Write" : "Read Only"}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-white text-base truncate mb-1" title={displayName}>
                        {displayName}
                      </h3>

                      {/* Metadata Line */}
                      <div className="flex items-center gap-2 text-xs text-white/40 mb-3.5 font-medium">
                        <span>{formattedSize}</span>
                        <span>•</span>
                        <span>{access.itemCount ? `${access.itemCount} items` : `${access.items?.length || 0} items`}</span>
                        <span>•</span>
                        <span>{dateStr}</span>
                      </div>

                      {/* Owner Details Card */}
                      <div className="bg-black/30 border border-white/5 rounded-2xl p-2.5 mb-4 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                          {owner.profilepic ? (
                            <img
                              src={getProfilePicUrl(owner.profilepic)}
                              alt={owner.name || "Owner"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = "block";
                                }
                              }}
                            />
                          ) : null}
                          <span
                            className="font-black text-xs uppercase text-purple-400 select-none"
                            style={{ display: owner.profilepic ? "none" : "block" }}
                          >
                            {getInitials(owner.name, owner.email)}
                          </span>
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {owner.name || "Vault Member"}
                          </p>
                          <p className="text-[10px] text-white/40 truncate font-mono">
                            {owner.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    {(() => {
                      const isFullAdmin = permission === "owner";
                      const hasGithub = (access.items || []).some((i) => i.provider === "github");
                      const hasGdrive = (access.items || []).some((i) => i.provider === "google_drive" || i.provider === "drive");
                      const hasDropbox = (access.items || []).some((i) => i.provider === "dropbox");
                      const isFullAdminBlocked = isFullAdmin && isNoPlan;
                      const isExternalBlocked =
                        (hasGithub && (isNoPlan || !hasFeature("github_backup"))) ||
                        (hasGdrive && (isNoPlan || !hasFeature("gdrive_sync"))) ||
                        (hasDropbox && (isNoPlan || !hasFeature("dropbox_sync")));
                      const isAccessBlocked = isFullAdminBlocked || isExternalBlocked;

                      return (
                        <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                          <button
                            onClick={() => handleOpenIncomingDrive(access)}
                            className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                              isAccessBlocked
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 hover:border-amber-500/40 shadow-sm"
                                : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 hover:border-purple-500/40"
                            }`}
                          >
                            {isAccessBlocked ? <Lock size={14} /> : <FolderOpen size={14} />}
                            <span>{isAccessBlocked ? "Plan Required to Open" : "Open Shared Vault"}</span>
                          </button>

                          <button
                            onClick={() => handleOpenIncomingDrive(access)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors"
                            title="Browse vault"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Incoming List View */
            <div className="space-y-2.5">
              {filteredIncomingDrives.map((access) => {
                const owner = access.userId || {};
                const isFullVault = !access.items || access.items.length === 0;
                const permission = (access.permission && access.permission[0]) || "read";
                const displayName = access.name || (isFullVault ? `${owner.name || "Owner"}'s Vault Node` : `${owner.name || "Owner"}'s Shared Items`);
                const formattedSize = access.size ? formatSize(access.size) : "0 B";
                const dateStr = access.createdAt
                  ? new Date(access.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recent";

                const isFullAdmin = permission === "owner";
                const hasGithub = (access.items || []).some((i) => i.provider === "github");
                const hasGdrive = (access.items || []).some((i) => i.provider === "google_drive" || i.provider === "drive");
                const hasDropbox = (access.items || []).some((i) => i.provider === "dropbox");
                const isFullAdminBlocked = isFullAdmin && isNoPlan;
                const isExternalBlocked =
                  (hasGithub && (isNoPlan || !hasFeature("github_backup"))) ||
                  (hasGdrive && (isNoPlan || !hasFeature("gdrive_sync"))) ||
                  (hasDropbox && (isNoPlan || !hasFeature("dropbox_sync")));
                const isAccessBlocked = isFullAdminBlocked || isExternalBlocked;

                return (
                  <div
                    key={access._id}
                    className="group px-4 py-3.5 rounded-2xl bg-vault-surface/70 hover:bg-vault-surface border border-white/5 hover:border-purple-500/25 transition-all duration-200 flex items-center justify-between gap-4"
                  >
                    {/* Left: Icon, Name & Owner */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                        {isFullVault ? <Layers size={18} /> : <FolderOpen size={18} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate" title={displayName}>
                            {displayName}
                          </span>
                          {access.isDemo && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-white/5 text-purple-300 border border-purple-500/20">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40 font-medium mt-0.5">
                          <span className="text-purple-300/70 font-semibold">{owner.name || "Vault Member"}</span>
                          <span>•</span>
                          <span>{owner.email}</span>
                          <span>•</span>
                          <span>{formattedSize}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Clearance Pill */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      {isFullAdminBlocked ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                          <Lock size={10} /> Full Admin
                        </span>
                      ) : isExternalBlocked ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                          <Lock size={10} /> Pro Plan Req
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            permission === "owner"
                              ? "bg-danger-accent/15 text-danger-accent border border-danger-accent/25"
                              : permission === "write"
                              ? "bg-media-accent/15 text-media-accent border border-media-accent/25"
                              : "bg-document-accent/15 text-document-accent border border-document-accent/25"
                          }`}
                        >
                          {permission === "owner" ? "Full Admin" : permission === "write" ? "Read & Write" : "Read Only"}
                        </span>
                      )}
                    </div>

                    {/* Right: Open Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenIncomingDrive(access)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isAccessBlocked
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25"
                            : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25"
                        }`}
                      >
                        {isAccessBlocked ? <Lock size={13} /> : <FolderOpen size={13} />}
                        <span>{isAccessBlocked ? "Plan Required" : "Open"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Floating Action Button (+) ── */}
      <button
        onClick={() => openShareModal && openShareModal([])}
        className="fixed bottom-7 right-7 z-30 w-14 h-14 rounded-full bg-accent-primary hover:opacity-90 text-accent-foreground flex items-center justify-center shadow-accent-glow hover:scale-105 active:scale-95 transition-all duration-300 group"
        title="Create New Share Link"
      >
        <Plus size={26} className="group-hover:rotate-90 transition-transform duration-300 font-bold" />
      </button>

      {/* ── Drive Quick Preview / File Explorer Modal ── */}
      {activeDrivePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setActiveDrivePreview(null)}
          />
          <div className="relative z-10 w-full max-w-xl bg-white dark:bg-vault-surface border border-slate-200 dark:border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-slate-900 dark:text-white space-y-4">
            <button
              onClick={() => setActiveDrivePreview(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                <FolderOpen size={22} />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-base sm:text-lg truncate">
                  {activeDrivePreview.name || `${activeDrivePreview.userId?.name || "Member"}'s Shared Relay`}
                </h3>
                <p className="text-xs text-purple-600 dark:text-purple-300/80 truncate">
                  Shared by {activeDrivePreview.userId?.name || "Vault User"} ({activeDrivePreview.userId?.email || ""})
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-white/60">
                <span>Security Clearance:</span>
                <span className="font-bold uppercase text-purple-600 dark:text-purple-300">
                  {activeDrivePreview.permission?.[0] || "read"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-white/60">
                <span>Total Size:</span>
                <span className="font-mono text-slate-900 dark:text-white/80">{formatSize(activeDrivePreview.size)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-white/60">
                <span>Items Included:</span>
                <span className="font-mono text-slate-900 dark:text-white/80">{activeDrivePreview.items?.length || "Full Drive"}</span>
              </div>
            </div>

            {activeDrivePreview.items && activeDrivePreview.items.length > 0 ? (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                {activeDrivePreview.items.map((item) => {
                  const itemId = item.id || item._id;
                  const isDir = item.type === "directory";
                  return (
                    <div
                      key={itemId}
                      className="p-3 bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {isDir ? (
                          <FolderOpen size={16} className="text-accent-primary shrink-0" />
                        ) : (
                          <FileText size={16} className="text-purple-500 dark:text-purple-400 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 dark:text-white truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-white/40 font-mono">
                            {formatSize(item.size || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isDir ? (
                          <button
                            onClick={() => {
                              setActiveDrivePreview(null);
                              navigate(`/dashboard/shared/folder/${itemId}`);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-accent-soft text-accent-primary hover:opacity-90 font-bold text-[11px] flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ExternalLink size={12} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setPreviewingFile({
                                  _id: itemId,
                                  name: item.name,
                                  extension: item.extension || (item.name.includes(".") ? `.${item.name.split(".").pop()}` : ""),
                                  size: item.size || 0,
                                  mimeType: item.mimeType || "",
                                  provider: item.provider || "local",
                                  userId: activeDrivePreview.userId?._id || activeDrivePreview.userId,
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-white/15 font-medium text-[11px] flex items-center gap-1"
                              title="Preview file"
                            >
                              <Eye size={12} />
                              <span>Preview</span>
                            </button>

                            <button
                              onClick={() => {
                                const downloadUrl = `${SERVER_URL}/file/${itemId}?action=download`;
                                const link = document.createElement("a");
                                link.href = downloadUrl;
                                link.setAttribute("download", item.name || "download");
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 font-medium text-[11px]"
                              title="Download file"
                            >
                              <Download size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-white/40">
                This drive grants access to the full vault chamber.
              </div>
            )}

            <Button
              onClick={() => setActiveDrivePreview(null)}
              className="w-full py-2.5 text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* ── File Preview Modal ── */}
      {previewingFile && (
        <Suspense fallback={null}>
          <FilePreviewModal
            isOpen={Boolean(previewingFile)}
            onClose={() => setPreviewingFile(null)}
            file={previewingFile}
            ownerId={previewingFile.userId}
          />
        </Suspense>
      )}

      {/* ── Edit Link Modal ── */}
      <EditLinkModal
        isOpen={Boolean(editingLink)}
        onClose={() => setEditingLink(null)}
        link={editingLink}
        onUpdated={handleLinkUpdated}
      />

      {/* ── Link QR Code Modal ── */}
      <LinkQRCodeModal
        isOpen={Boolean(qrModalData)}
        onClose={() => setQrModalData(null)}
        url={qrModalData?.url}
        title={qrModalData?.title}
      />

      {/* ── Access Shared Link Modal ── */}
      <AccessSharedLinkModal
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        onClaimSuccess={() => {
          fetchIncomingDrives();
          setActiveTab("incoming");
        }}
      />

      {/* ── Plan Upgrade Prompt Modal ── */}
      {planUpgradeModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setPlanUpgradeModal(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-vault-surface border border-slate-200 dark:border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-slate-900 dark:text-white space-y-4">
            <button
              onClick={() => setPlanUpgradeModal(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Lock size={22} />
            </div>

            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1.5">
                {planUpgradeModal.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
                {planUpgradeModal.message}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setPlanUpgradeModal(null);
                  navigate("/dashboard/billing");
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                <span>View Plans & Upgrade</span>
              </button>

              <button
                onClick={() => setPlanUpgradeModal(null)}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white/70 text-xs font-semibold transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
