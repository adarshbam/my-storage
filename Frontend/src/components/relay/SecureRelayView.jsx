import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import SharedLinkCard from "./SharedLinkCard";
import SharedLinkRow from "./SharedLinkRow";
import EditLinkModal from "./EditLinkModal";
import LinkQRCodeModal from "./LinkQRCodeModal";
import Skeleton from "../ui/Skeleton";
import Button from "../ui/Button";
import { usePlan } from "../../context/PlanContext";
import { formatSize } from "../../lib/utils";

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

  // Demo Toast / Preview State
  const [demoActiveDrive, setDemoActiveDrive] = useState(null);

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
    if (access.isDemo) {
      setDemoActiveDrive(access);
      return;
    }

    const owner = access.userId;
    const isFullVault = !access.items || access.items.length === 0;

    if (isFullVault && owner?.rootDirId) {
      navigate(`/dashboard/shared/folder/${owner.rootDirId}`);
    } else if (access.items && access.items.length > 0) {
      const first = access.items[0];
      if (first.type === "directory") {
        navigate(`/dashboard/shared/folder/${first.id}`);
      } else {
        // Single file or items list
        navigate(`/dashboard/shared/folder/${first.id || access._id}`);
      }
    }
  };

  const currentCount = activeTab === "outgoing" ? filteredLinks.length : filteredIncomingDrives.length;
  const currentTotal = activeTab === "outgoing" ? links.length : effectiveIncomingDrives.length;

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 pb-20">
      
      {/* ── Header Section (Matching Design Reference) ── */}
      <div className="bg-vault-surface/90 border border-white/5 rounded-3xl p-6 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        
        {/* Top Tag & Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            {/* LINK MANAGEMENT / INCOMING RELAYS BADGE */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-2 shadow-sm ${
              activeTab === "outgoing"
                ? "bg-relay-accent/10 border border-relay-accent/20 text-relay-accent shadow-[0_0_12px_rgba(126,134,255,0.15)]"
                : "bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
            }`}>
              <Share2 size={13} />
              <span>{activeTab === "outgoing" ? "Link Management" : "Incoming Relays"}</span>
            </div>

            {/* Title & Count */}
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {activeTab === "outgoing" ? "Your Shared Links" : "Shared With You"}
              </h1>
              <span className="text-sm font-semibold text-white/40 font-mono">
                {loadingLinks || loadingIncoming ? "..." : `${currentCount} items`}
              </span>
            </div>
          </div>

          {/* Tab Switcher: Your Shared Links vs Shared With Me */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1 shrink-0">
            <button
              onClick={() => {
                setActiveTab("outgoing");
                setSearchQuery("");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "outgoing"
                  ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <span>Shared Links</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "outgoing" ? "bg-black/20 text-black" : "bg-white/10 text-white/60"
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
                  ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <span>Shared With Me</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === "incoming" ? "bg-black/20 text-black" : "bg-white/10 text-white/60"
              }`}>
                {effectiveIncomingDrives.length}
              </span>
            </button>
          </div>
        </div>

        {/* ── Controls Row: Search + Status/Clearance Filter Pills + Sort + View Switch (Active on BOTH tabs) ── */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-4 border-t border-white/5">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "outgoing" ? "Search files, links, or tokens..." : "Search shared vaults, owners, or files..."}
              className="w-full pl-10 pr-9 py-2.5 bg-black/40 border border-white/10 text-white placeholder-white/30 rounded-2xl text-xs sm:text-sm focus:border-vault-emerald focus:ring-1 focus:ring-vault-emerald/30 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills, Sort Dropdown & View Mode */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            
            {/* Filter Pills Group for Outgoing Links */}
            {activeTab === "outgoing" ? (
              <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "all"
                      ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  All Links
                </button>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "active"
                      ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("protected")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "protected"
                      ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Protected
                </button>
                <button
                  onClick={() => setStatusFilter("expired")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === "expired"
                      ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Expired
                </button>
              </div>
            ) : (
              /* Filter Pills Group for Incoming Shared Drives */
              <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1">
                <button
                  onClick={() => setIncomingFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    incomingFilter === "all"
                      ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "text-white/50 hover:text-white"
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
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all"
              >
                <ArrowUpDown size={13} className="text-vault-emerald" />
                <span>{sortLabels[sortBy] || "Sort"}</span>
                <ChevronDown size={13} className="text-white/40" />
              </button>

              {sortDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setSortDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-30 w-44 bg-vault-panel/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-0.5 animate-fade-in">
                    {Object.entries(sortLabels).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setSortDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-xs font-medium rounded-xl text-left transition-colors ${
                          sortBy === key
                            ? "bg-vault-emerald/20 text-vault-emerald font-bold"
                            : "text-white/70 hover:text-white hover:bg-white/5"
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
            <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "list"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white"
                }`}
                title="List view"
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "grid"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white"
                }`}
                title="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
            </div>

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
            <div className="flex flex-col items-center justify-center text-center p-12 bg-vault-surface/40 border border-dashed border-white/10 rounded-3xl space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-vault-emerald/10 text-vault-emerald border border-vault-emerald/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,165,0.15)]">
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
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                          <User size={15} />
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
                    <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenIncomingDrive(access)}
                        className="flex-1 py-2 px-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 hover:border-purple-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <FolderOpen size={14} />
                        <span>Open Shared Vault</span>
                      </button>

                      <button
                        onClick={() => handleOpenIncomingDrive(access)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors"
                        title="Browse vault"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
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
                    </div>

                    {/* Right: Open Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenIncomingDrive(access)}
                        className="py-1.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <FolderOpen size={13} />
                        <span>Open</span>
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
        className="fixed bottom-7 right-7 z-30 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 group"
        title="Create New Share Link"
      >
        <Plus size={26} className="group-hover:rotate-90 transition-transform duration-300 font-bold" />
      </button>

      {/* ── Demo Drive Quick Preview Modal ── */}
      {demoActiveDrive && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setDemoActiveDrive(null)}
          />
          <div className="relative z-10 w-full max-w-lg bg-vault-surface border border-purple-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <button
              onClick={() => setDemoActiveDrive(null)}
              className="absolute top-5 right-5 p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                <FolderOpen size={22} />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-white text-lg truncate">
                  {demoActiveDrive.name}
                </h3>
                <p className="text-xs text-purple-300/80">
                  Shared by {demoActiveDrive.userId.name} ({demoActiveDrive.userId.email})
                </p>
              </div>
            </div>

            <div className="p-3 bg-black/40 border border-white/5 rounded-2xl mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Security Clearance:</span>
                <span className="font-bold uppercase text-purple-300">
                  {demoActiveDrive.permission[0]}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Total Size:</span>
                <span className="font-mono text-white/80">{formatSize(demoActiveDrive.size)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Files Included:</span>
                <span className="font-mono text-white/80">{demoActiveDrive.items.length || "Entire Vault"}</span>
              </div>
            </div>

            {demoActiveDrive.items.length > 0 && (
              <div className="space-y-2 mb-5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {demoActiveDrive.items.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 bg-black/60 border border-white/5 rounded-xl flex items-center justify-between text-xs text-white/80"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-purple-400" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40 shrink-0">
                      {formatSize(f.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={() => setDemoActiveDrive(null)}
              className="w-full py-2.5 text-xs font-bold"
            >
              Close Preview
            </Button>
          </div>
        </div>
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

    </div>
  );
}
