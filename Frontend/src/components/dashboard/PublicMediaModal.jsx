import { useState, useEffect } from "react";
import {
  X,
  Globe,
  Lock,
  Shield,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Layers,
  Sparkles,
  Settings,
  AlertTriangle,
  Play,
  RotateCw,
  FolderOpen,
  Folder,
  Eye,
  CheckCircle,
  ListVideo,
  Download,
  FileCode,
  FileText,
  Search,
  Image as ImageIcon,
  Music,
  FileBox,
  File,
} from "lucide-react";
import { SERVER_URL } from "../../lib/api";
import { formatSize } from "../../lib/utils";
import Button from "../ui/Button";
import VideoPlayer from "../drive/VideoPlayer";

const ACCENT_PRESETS = [
  { name: "Cyan", hex: "#00f0ff" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Obsidian", hex: "#f59e0b" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Monochrome", hex: "#ffffff" },
];

export const getFileType = (ext = "", name = "") => {
  const e = (ext || name.split(".").pop() || "").toLowerCase().replace(/^\./, "");
  if (["mp4", "webm", "mov", "m4v", "mkv", "ogv"].includes(e)) return "video";
  if (["png", "jpg", "jpeg", "webp", "svg", "gif", "avif", "bmp", "ico"].includes(e)) return "image";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(e)) return "audio";
  if (["pdf"].includes(e)) return "pdf";
  if (["gltf", "glb", "obj", "fbx"].includes(e)) return "3d";
  return "file";
};

export default function PublicMediaModal({ isOpen, onClose, item, type = "file", onUpdated }) {
  const isFolder = type === "directory" || item?.type === "directory";
  const itemId = item?._id || item?.id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("preview"); // "preview" | "security" | "branding" | "snippets"

  // Public Access Configuration State
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState("");
  const [isWildcard, setIsWildcard] = useState(true);
  const [domainList, setDomainList] = useState([]);
  const [newDomainInput, setNewDomainInput] = useState("");

  // Player Studio Settings State
  const [accentColor, setAccentColor] = useState("#00f0ff");
  const [hideBranding, setHideBranding] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState("");
  const [watermarkPos, setWatermarkPos] = useState("top-right");
  const [watermarkClick, setWatermarkClick] = useState("");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.8);
  const [autoPlay, setAutoPlay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [controls, setControls] = useState(true);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [borderRadius, setBorderRadius] = useState("12px");

  // Output URLs & Snippets
  const [streamUrl, setStreamUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [folderItems, setFolderItems] = useState([]);
  const [folderSubfolders, setFolderSubfolders] = useState([]);
  const [manifestUrl, setManifestUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);

  // Folder Playlist State
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedSubfolderFilter, setSelectedSubfolderFilter] = useState("all");
  const [clipSearch, setClipSearch] = useState("");

  useEffect(() => {
    if (isOpen && itemId) {
      fetchCurrentConfig();
    }
  }, [isOpen, itemId]);

  const fetchCurrentConfig = async () => {
    setLoading(true);
    try {
      const endpoint = isFolder
        ? `${SERVER_URL}/directory/${itemId}/public-access`
        : `${SERVER_URL}/file/${itemId}/public-access`;

      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const p = data.publicAccess || {};
        const s = p.playerSettings || {};

        setEnabled(Boolean(p.enabled));
        setToken(p.token || "");

        const origins = p.allowedOrigins || ["*"];
        const hasWildcard = origins.includes("*");
        setIsWildcard(hasWildcard);
        setDomainList(origins.filter((o) => o !== "*"));

        setAccentColor(s.accentColor || "#00f0ff");
        setHideBranding(Boolean(s.hideBranding));
        setWatermarkUrl(s.customWatermark?.url || "");
        setWatermarkPos(s.customWatermark?.position || "top-right");
        setWatermarkClick(s.customWatermark?.clickUrl || "");
        setWatermarkOpacity(s.customWatermark?.opacity ?? 0.8);
        setAutoPlay(Boolean(s.autoPlay));
        setLoop(Boolean(s.loop));
        setMuted(Boolean(s.muted));
        setControls(s.controls !== false);
        setAspectRatio(s.aspectRatio || "16:9");
        setBorderRadius(s.borderRadius || "12px");

        if (data.items && Array.isArray(data.items)) {
          setFolderItems(data.items);
          setFolderSubfolders(Array.isArray(data.subfolders) ? data.subfolders : []);
          if (data.items.length > 0) {
            setSelectedClipId((prev) => (prev && data.items.some((i) => i.id === prev) ? prev : data.items[0].id));
            setStreamUrl(data.streamUrl || data.items[0].streamUrl || "");
          } else {
            setStreamUrl("");
          }
        } else {
          setStreamUrl(data.streamUrl || "");
          setFolderSubfolders([]);
        }

        setEmbedUrl(data.embedUrl || "");
        if (data.manifestUrl) setManifestUrl(data.manifestUrl);
      }
    } catch (err) {
      console.error("Failed to fetch public access configuration:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (newEnabledState = enabled) => {
    setSaving(true);
    try {
      const allowedOrigins = isWildcard
        ? ["*"]
        : domainList.length > 0
        ? domainList
        : ["*"];

      const payload = {
        enabled: Boolean(newEnabledState),
        allowedOrigins,
        playerSettings: {
          accentColor,
          hideBranding,
          customWatermark: {
            url: watermarkUrl.trim(),
            position: watermarkPos,
            clickUrl: watermarkClick.trim(),
            opacity: Number(watermarkOpacity),
          },
          autoPlay,
          loop,
          muted,
          controls,
          aspectRatio,
          borderRadius,
        },
      };

      const endpoint = isFolder
        ? `${SERVER_URL}/directory/${itemId}/public-access`
        : `${SERVER_URL}/file/${itemId}/public-access`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setEnabled(newEnabledState);

        if (data.publicAccess?.token) {
          setToken(data.publicAccess.token);
        }

        if (data.items && Array.isArray(data.items)) {
          setFolderItems(data.items);
          setFolderSubfolders(Array.isArray(data.subfolders) ? data.subfolders : []);
          if (data.items.length > 0) {
            setSelectedClipId((prev) => (prev && data.items.some((i) => i.id === prev) ? prev : data.items[0].id));
            setStreamUrl(data.streamUrl || data.items[0].streamUrl || "");
          } else {
            setStreamUrl("");
          }
        } else {
          setStreamUrl(data.streamUrl || "");
          setFolderSubfolders([]);
        }

        setEmbedUrl(data.embedUrl || "");
        if (data.manifestUrl) setManifestUrl(data.manifestUrl);

        if (onUpdated) {
          onUpdated(data.publicAccess || payload);
        }

        setCopiedKey("saved");
        setTimeout(() => setCopiedKey(null), 2500);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to update public media settings");
      }
    } catch (err) {
      console.error("Error saving public media configuration:", err);
      alert("Failed to save configuration. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = () => {
    const val = newDomainInput.trim().toLowerCase();
    if (!val) return;
    if (!domainList.includes(val)) {
      setDomainList([...domainList, val]);
    }
    setNewDomainInput("");
  };

  const handleRemoveDomain = (dom) => {
    setDomainList(domainList.filter((d) => d !== dom));
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Active clip resolution
  const activeClip = isFolder
    ? folderItems.find((f) => f.id === selectedClipId) || folderItems[0] || null
    : null;

  const currentActiveStreamUrl = isFolder
    ? (activeClip?.streamUrl || streamUrl)
    : streamUrl;

  const currentActiveName = isFolder
    ? (activeClip?.name || item?.name || "Asset")
    : (item?.name || "Asset");

  const currentActiveExt = isFolder
    ? (activeClip?.extension || activeClip?.name?.split(".").pop() || "")
    : (item?.extension || item?.name?.split(".").pop() || "");

  const activeFileType = getFileType(currentActiveExt, currentActiveName);

  const currentEmbedCode = embedUrl
    ? `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="aspect-ratio: ${aspectRatio.replace(":", "/")}; border-radius: ${borderRadius};"></iframe>`
    : "";

  const currentVideoTag = currentActiveStreamUrl
    ? activeFileType === "image"
      ? `<img src="${currentActiveStreamUrl}" alt="${currentActiveName}" loading="lazy" />`
      : activeFileType === "audio"
      ? `<audio src="${currentActiveStreamUrl}" controls preload="metadata"></audio>`
      : `<video src="${currentActiveStreamUrl}" ${autoPlay ? "autoplay " : ""}${loop ? "loop " : ""}${muted ? "muted " : ""}${controls ? "controls " : ""}playsinline preload="metadata"></video>`
    : "";

  const filteredFolderItems = folderItems.filter((f) => {
    // 1. Subfolder filter
    if (selectedSubfolderFilter === "root") {
      if (f.subfolder) return false;
    } else if (selectedSubfolderFilter !== "all") {
      const isMatch =
        (f.subfolderId && String(f.subfolderId) === String(selectedSubfolderFilter)) ||
        (f.subfolder && f.subfolder === selectedSubfolderFilter);
      if (!isMatch) return false;
    }

    // 2. Search query filter
    if (clipSearch) {
      const q = clipSearch.toLowerCase();
      const matchesName = f.name?.toLowerCase().includes(q);
      const matchesSubfolder = f.subfolder?.toLowerCase().includes(q);
      return matchesName || matchesSubfolder;
    }
    return true;
  });

  const handleExportAllUrlsText = () => {
    const text = folderItems
      .map((f) => (f.subfolder ? `[${f.subfolder}] ${f.name}: ${f.streamUrl}` : `${f.name}: ${f.streamUrl}`))
      .join("\n");
    copyToClipboard(text, "export-txt");
  };

  const handleExportAllUrlsJson = () => {
    const json = JSON.stringify(
      folderItems.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        extension: f.extension,
        subfolder: f.subfolder || null,
        subfolderId: f.subfolderId || null,
        streamUrl: f.streamUrl,
        embedUrl: f.embedUrl,
      })),
      null,
      2
    );
    copyToClipboard(json, "export-json");
  };

  const renderFileIcon = (fileExt = "", fileName = "") => {
    const fType = getFileType(fileExt, fileName);
    if (fType === "video") return <Play size={13} className="text-accent-primary fill-current" />;
    if (fType === "image") return <ImageIcon size={13} className="text-emerald-400" />;
    if (fType === "audio") return <Music size={13} className="text-amber-400" />;
    if (fType === "3d") return <FileBox size={13} className="text-purple-400" />;
    return <FileText size={13} className="text-cyan-400" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Dialog (Flex col with pinned header and pinned footer) */}
      <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Subtle Top Radial Aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[180px] bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-primary-rgb),0.14)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(var(--accent-primary-rgb),0.10)_0%,transparent_70%)] pointer-events-none rounded-t-3xl z-0" />

        {/* ── Fixed Header ── */}
        <div className="p-4 sm:p-6 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0 relative z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all z-20 cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 pr-12">
            <div className="p-2 sm:p-2.5 bg-accent-soft text-accent-primary rounded-xl sm:rounded-2xl border border-accent-border shadow-accent-glow-sm shrink-0">
              {isFolder ? <FolderOpen size={22} /> : <Globe size={22} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white uppercase truncate">
                {item?.name || "Media Asset"} • {isFolder ? "Public Assets Studio" : "Public Stream Studio"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-white/50 truncate">
                {isFolder
                  ? `Publishing entire folder (${folderItems.length} assets: videos, high-res PNGs & media) via Cloudflare CDN ($0 egress)`
                  : "Deliver via Cloudflare CDN ($0 egress), domain protection & custom embed"}
              </p>
            </div>
          </div>

          {/* Status Switcher Banner */}
          <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  enabled
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                }`}
              >
                {enabled ? <Globe size={18} /> : <Lock size={18} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Edge Delivery Status:
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-semibold ${
                      enabled
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                    }`}
                  >
                    {enabled ? "Live at Edge" : "Private & Protected"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-white/40 mt-0.5">
                  {enabled
                    ? isFolder
                      ? `Public assets are live. All ${folderItems.length} media files are streaming with zero egress cost.`
                      : "Public media stream is active. Bound to your domain rules below."
                    : isFolder
                    ? "By default, this folder and all its contents are strictly private. Enable delivery to publish."
                    : "By default, this item is private. Enable delivery to embed or stream on your portfolio."}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleSaveConfig(!enabled)}
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer ${
                enabled
                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-accent-primary hover:bg-accent-primary/90 text-white shadow-accent-glow"
              }`}
            >
              {saving
                ? "Updating..."
                : enabled
                ? isFolder
                  ? "Revoke Public Access"
                  : "Revoke Public Access"
                : isFolder
                ? "Publish Folder Assets"
                : "Enable Public Media"}
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 pt-3 overflow-x-auto">
            {[
              { id: "preview", label: isFolder ? "Live Asset Preview" : "Live Player Preview", icon: Play },
              { id: "security", label: "Domain Protection", icon: Shield },
              { id: "branding", label: "Player Customization", icon: Settings },
              { id: "snippets", label: isFolder ? "Folder Embed & URLs" : "Embed & URLs", icon: Code2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-accent-soft text-accent-primary border border-accent-border shadow-accent-glow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 relative z-10">
          {/* TAB 1: LIVE PLAYER / ASSET PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              {/* Media Preview Box */}
              <div className="w-full bg-black rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl relative flex items-center justify-center min-h-[280px] max-h-[460px]">
                {enabled && currentActiveStreamUrl ? (
                  activeFileType === "video" ? (
                    <div className="w-full h-full aspect-video max-h-[440px]">
                      <VideoPlayer
                        key={currentActiveStreamUrl}
                        src={currentActiveStreamUrl}
                        title={currentActiveName}
                        accentColor={accentColor}
                        hideBranding={hideBranding}
                        customWatermark={{
                          url: watermarkUrl,
                          position: watermarkPos,
                          clickUrl: watermarkClick,
                          opacity: watermarkOpacity,
                        }}
                        autoPlay={false}
                        loop={loop}
                        muted={muted}
                        controls={controls}
                        borderRadius="0px"
                        isEmbed={true}
                      />
                    </div>
                  ) : activeFileType === "image" ? (
                    <div className="w-full h-full min-h-[300px] max-h-[440px] flex flex-col items-center justify-center p-4 bg-gradient-radial from-slate-900/60 to-black relative">
                      <img
                        src={currentActiveStreamUrl}
                        alt={currentActiveName}
                        className="max-h-[380px] max-w-full object-contain rounded-xl shadow-2xl transition-all"
                        loading="eager"
                      />
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-white/60 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="truncate pr-2 font-mono font-semibold">{currentActiveName}</span>
                        <a
                          href={currentActiveStreamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-primary hover:underline flex items-center gap-1 font-semibold shrink-0"
                        >
                          <ExternalLink size={12} /> High-Res
                        </a>
                      </div>
                    </div>
                  ) : activeFileType === "audio" ? (
                    <div className="w-full py-12 px-6 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
                        <Music size={32} />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1 truncate max-w-md">{currentActiveName}</h4>
                      <p className="text-xs text-white/40 mb-4 font-mono">Audio Stream • Edge CDN</p>
                      <audio src={currentActiveStreamUrl} controls className="w-full max-w-md" preload="metadata" />
                    </div>
                  ) : (
                    <div className="w-full py-12 px-6 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary flex items-center justify-center mb-4">
                        <FileBox size={32} />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1 truncate max-w-md">{currentActiveName}</h4>
                      <p className="text-xs text-white/40 mb-4 font-mono">
                        {currentActiveExt.toUpperCase() || "Asset"} File • Ready for Edge CDN Delivery
                      </p>
                      <a
                        href={currentActiveStreamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-accent-primary text-black font-bold text-xs flex items-center gap-1.5 hover:opacity-90 shadow-accent-glow"
                      >
                        <Download size={14} /> Direct CDN Download
                      </a>
                    </div>
                  )
                ) : enabled && isFolder && folderItems.length === 0 ? (
                  <div className="text-center p-6 text-white/50 flex flex-col items-center">
                    <FolderOpen size={36} className="text-white/20 mb-2" />
                    <p className="text-sm font-semibold text-white/70">
                      Folder is empty
                    </p>
                    <p className="text-xs text-white/40 mt-1 max-w-sm">
                      This folder is live on Cloudflare CDN, but contains no media files yet. Drag and drop videos or large PNG assets into this folder in your Vault Drive.
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-6 text-white/50 flex flex-col items-center">
                    <Globe size={32} className="text-white/20 mb-2" />
                    <p className="text-sm font-semibold text-white/70">
                      Edge streaming preview is not live yet
                    </p>
                    <p className="text-xs text-white/40 mt-1 max-w-sm">
                      Click &quot;{isFolder ? "Publish Folder Assets" : "Enable Public Media"}&quot; above to generate your edge streams and live preview.
                    </p>
                  </div>
                )}
              </div>

              {/* Folder Playlist Track Selector (if folder and enabled) */}
              {isFolder && enabled && folderItems.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 p-3 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-accent-soft text-accent-primary">
                        <ListVideo size={15} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                        Folder Assets ({folderItems.length} files)
                      </span>
                    </div>
                    {activeClip && (
                      <span className="text-[11px] text-slate-500 dark:text-white/50 font-mono truncate max-w-xs">
                        Now Viewing: <strong className="text-accent-primary">{activeClip.name}</strong>
                      </span>
                    )}
                  </div>

                  {/* Subfolder Category Filters */}
                  {folderSubfolders.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        onClick={() => setSelectedSubfolderFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          selectedSubfolderFilter === "all"
                            ? "bg-accent-primary text-black font-bold shadow-sm"
                            : "bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/15"
                        }`}
                      >
                        All ({folderItems.length})
                      </button>
                      <button
                        onClick={() => setSelectedSubfolderFilter("root")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          selectedSubfolderFilter === "root"
                            ? "bg-accent-primary text-black font-bold shadow-sm"
                            : "bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/15"
                        }`}
                      >
                        Root ({folderItems.filter((f) => !f.subfolder).length})
                      </button>
                      {folderSubfolders.map((sf) => (
                        <button
                          key={sf.id}
                          onClick={() => setSelectedSubfolderFilter(sf.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedSubfolderFilter === sf.id
                              ? "bg-accent-primary text-black font-bold shadow-sm"
                              : "bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/15"
                          }`}
                        >
                          <Folder size={11} />
                          <span>{sf.name}</span>
                          <span className="opacity-75">({sf.itemCount})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {filteredFolderItems.map((clip, idx) => {
                      const isCurrent = activeClip?.id === clip.id;
                      const cType = getFileType(clip.extension, clip.name);
                      return (
                        <div
                          key={clip.id}
                          onClick={() => {
                            setSelectedClipId(clip.id);
                            setStreamUrl(clip.streamUrl);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-accent-soft/40 border-accent-primary/60 text-slate-900 dark:text-white shadow-sm ring-1 ring-accent-primary/30"
                              : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/5 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                isCurrent
                                  ? "bg-accent-primary text-black"
                                  : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60"
                              }`}
                            >
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="p-1 rounded bg-slate-100 dark:bg-white/5 shrink-0">
                              {renderFileIcon(clip.extension, clip.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate leading-tight">
                                {clip.name}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-slate-400 dark:text-white/40 font-mono">
                                  {clip.size ? formatSize(clip.size) : ""} • {clip.extension?.toUpperCase() || cType.toUpperCase()}
                                </span>
                                {clip.subfolder && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent-soft text-accent-primary border border-accent-border font-semibold flex items-center gap-1">
                                    <Folder size={9} />
                                    <span>{clip.subfolder}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isCurrent && (
                              <span className="text-[10px] font-mono font-bold text-accent-primary uppercase px-1.5 py-0.5 rounded bg-accent-soft border border-accent-border hidden sm:inline-block">
                                Active
                              </span>
                            )}
                            <button
                              onClick={() => copyToClipboard(clip.streamUrl, `clip-stream-${clip.id}`)}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-accent-soft text-slate-600 dark:text-white/70 hover:text-accent-primary transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Copy Direct Edge CDN Stream URL"
                            >
                              {copiedKey === `clip-stream-${clip.id}` ? (
                                <>
                                  <Check size={12} className="text-emerald-500" />
                                  <span className="text-emerald-500 text-[10px]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span className="text-[10px]">CDN URL</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Preset Selector underneath preview (only for videos) */}
              {activeFileType === "video" && (
                <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-white/40 font-medium">
                    Player Accent Theme:
                  </span>
                  <div className="flex items-center gap-2">
                    {ACCENT_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        onClick={() => setAccentColor(p.hex)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer"
                        style={{
                          borderColor: accentColor === p.hex ? p.hex : "rgba(255,255,255,0.1)",
                          backgroundColor:
                            accentColor === p.hex ? `${p.hex}20` : "transparent",
                          color: accentColor === p.hex ? p.hex : "inherit",
                        }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: p.hex }}
                        />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOMAIN PROTECTION & SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield size={14} className="text-accent-primary" />
                  Origin & Anti-Hotlinking Rules
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">
                  Restrict playback to your portfolio or approved client domains. Cloudflare Edge rejects any request originating from an unauthorized site with a 403 Forbidden.
                </p>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="domainScope"
                      checked={isWildcard}
                      onChange={() => setIsWildcard(true)}
                      className="accent-accent-primary"
                    />
                    <span>
                      <strong>Public Everywhere (`*`)</strong> — Playable anywhere on the web (like YouTube).
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="domainScope"
                      checked={!isWildcard}
                      onChange={() => setIsWildcard(false)}
                      className="accent-accent-primary"
                    />
                    <span>
                      <strong>Restricted Domains</strong> — Only allowed hostnames or wildcards can stream.
                    </span>
                  </label>
                </div>
              </div>

              {!isWildcard && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70">
                    Allowed Domains & Wildcards
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                      placeholder="e.g. adarshsingh.dev, *.netlify.app, localhost:5173"
                      className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-accent-primary"
                    />
                    <Button
                      onClick={handleAddDomain}
                      className="px-4 py-2 text-xs font-semibold"
                    >
                      Add Domain
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {domainList.length === 0 ? (
                      <span className="text-xs text-amber-500 flex items-center gap-1 font-medium">
                        <AlertTriangle size={14} /> No domains added yet. Playback will default to public everywhere until you add an origin.
                      </span>
                    ) : (
                      domainList.map((dom) => (
                        <span
                          key={dom}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent-soft text-accent-primary text-xs font-mono font-medium border border-accent-border"
                        >
                          <span>{dom}</span>
                          <button
                            onClick={() => handleRemoveDomain(dom)}
                            className="hover:text-red-400 cursor-pointer ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLAYER CUSTOMIZATION & BRANDING */}
          {activeTab === "branding" && (
            <div className="space-y-4">
              {/* Dimensions & Border */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Frame Dimensions & Radii
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-white/60 mb-1">
                      Aspect Ratio Preset
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10"
                    >
                      <option value="16:9">16:9 (Standard Widescreen)</option>
                      <option value="4:3">4:3 (Classic Portfolio)</option>
                      <option value="1:1">1:1 (Square Grid)</option>
                      <option value="9:16">9:16 (Vertical Mobile Reel)</option>
                      <option value="21:9">21:9 (Cinematic Ultrawide)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-white/60 mb-1">
                      Corner Radius
                    </label>
                    <select
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10"
                    >
                      <option value="0px">0px (Sharp Corners)</option>
                      <option value="8px">8px (Subtle)</option>
                      <option value="12px">12px (Smooth Modern)</option>
                      <option value="20px">20px (Apple Style)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Watermark & Branding */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Player Branding & White-Labeling
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                      Vault branding is clean and unbloated by default. You can hide it completely for pure white-labeling.
                    </p>
                  </div>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5 cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Hide Vault Branding Badge
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-white/40 block">
                      Completely removes the Vault glyph badge for a 100% white-labeled player.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hideBranding}
                    onChange={(e) => setHideBranding(e.target.checked)}
                    className="accent-accent-primary w-4 h-4 cursor-pointer"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-white/60 mb-1">
                      Custom Watermark Logo (URL)
                    </label>
                    <input
                      type="url"
                      value={watermarkUrl}
                      onChange={(e) => setWatermarkUrl(e.target.value)}
                      placeholder="https://yourportfolio.com/logo.png"
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-white/60 mb-1">
                      Watermark Position
                    </label>
                    <select
                      value={watermarkPos}
                      onChange={(e) => setWatermarkPos(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10"
                    >
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Playback Toggles */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                  Playback Behavior
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-white/80">
                    <input
                      type="checkbox"
                      checked={loop}
                      onChange={(e) => setLoop(e.target.checked)}
                      className="accent-accent-primary w-4 h-4"
                    />
                    <span>Loop Continuously</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-white/80">
                    <input
                      type="checkbox"
                      checked={autoPlay}
                      onChange={(e) => setAutoPlay(e.target.checked)}
                      className="accent-accent-primary w-4 h-4"
                    />
                    <span>Autoplay (Muted)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-white/80">
                    <input
                      type="checkbox"
                      checked={controls}
                      onChange={(e) => setControls(e.target.checked)}
                      className="accent-accent-primary w-4 h-4"
                    />
                    <span>Show Controls Bar</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EMBED SNIPPETS & DIRECT STREAMING */}
          {activeTab === "snippets" && (
            <div className="space-y-4">
              {/* If Folder: Playlist Embed iFrame */}
              {isFolder ? (
                <>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          1. Full Playlist Responsive iFrame Embed
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-soft text-accent-primary font-bold">
                          {folderItems.length} ASSETS
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(currentEmbedCode, "iframe")}
                        className="flex items-center gap-1 text-xs text-accent-primary hover:underline font-semibold cursor-pointer"
                      >
                        {copiedKey === "iframe" ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedKey === "iframe" ? "Copied!" : "Copy Playlist iFrame"}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/40">
                      Embeds the full interactive playlist player on your portfolio with track navigation and clip switching.
                    </p>
                    <div className="p-3 bg-black/60 rounded-xl font-mono text-[11px] text-white/70 overflow-x-auto select-all">
                      {currentEmbedCode || "Enable public access above to generate playlist embed code."}
                    </div>
                  </div>

                  {/* Public Folder Manifest API URL */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        2. Public Playlist Manifest JSON API
                      </span>
                      <div className="flex items-center gap-2">
                        {manifestUrl && (
                          <a
                            href={manifestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-white font-semibold mr-2"
                          >
                            <ExternalLink size={13} /> Open JSON
                          </a>
                        )}
                        <button
                          onClick={() => copyToClipboard(manifestUrl, "manifest")}
                          className="flex items-center gap-1 text-xs text-accent-primary hover:underline font-semibold cursor-pointer"
                        >
                          {copiedKey === "manifest" ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedKey === "manifest" ? "Copied!" : "Copy Manifest URL"}</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-white/40">
                      Public unauthenticated endpoint returning all file names, IDs, sizes, and signed streaming links. Perfect for fetching in custom WebGL / Three.js portfolios or dynamic video grids.
                    </p>
                    <div className="p-3 bg-black/60 rounded-xl font-mono text-[11px] text-white/70 overflow-x-auto select-all">
                      {manifestUrl || "Enable public access above to generate manifest URL."}
                    </div>

                    {manifestUrl && (
                      <div className="pt-2">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `const res = await fetch("${manifestUrl}");\nconst { items } = await res.json();\n// items: [{ name, streamUrl, embedUrl, size }, ...]\nitems.forEach(asset => console.log(asset.name, asset.streamUrl));`,
                              "fetch-code"
                            )
                          }
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <FileCode size={13} />
                          <span>
                            {copiedKey === "fetch-code" ? "Copied Fetch Snippet!" : "Copy JavaScript fetch() Example"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Batch Export Options */}
                  {folderItems.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          3. Batch Export Links
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleExportAllUrlsText}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedKey === "export-txt" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          <span>{copiedKey === "export-txt" ? "Copied All URLs!" : "Copy All Stream URLs (List)"}</span>
                        </button>

                        <button
                          onClick={handleExportAllUrlsJson}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedKey === "export-json" ? <Check size={14} className="text-emerald-500" /> : <Download size={14} />}
                          <span>{copiedKey === "export-json" ? "Copied JSON!" : "Copy All Metadata as JSON"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Individual Media Clips Table */}
                  {folderItems.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          4. Individual Folder Assets ({folderItems.length})
                        </span>
                        <div className="relative w-full sm:w-56">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={clipSearch}
                            onChange={(e) => setClipSearch(e.target.value)}
                            placeholder="Filter files..."
                            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {folderSubfolders.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <button
                            onClick={() => setSelectedSubfolderFilter("all")}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                              selectedSubfolderFilter === "all"
                                ? "bg-accent-primary text-black font-bold"
                                : "bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/15"
                            }`}
                          >
                            All ({folderItems.length})
                          </button>
                          <button
                            onClick={() => setSelectedSubfolderFilter("root")}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                              selectedSubfolderFilter === "root"
                                ? "bg-accent-primary text-black font-bold"
                                : "bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/15"
                            }`}
                          >
                            Root ({folderItems.filter((f) => !f.subfolder).length})
                          </button>
                          {folderSubfolders.map((sf) => (
                            <button
                              key={sf.id}
                              onClick={() => setSelectedSubfolderFilter(sf.id)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                selectedSubfolderFilter === sf.id
                                  ? "bg-accent-primary text-black font-bold"
                                  : "bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/15"
                              }`}
                            >
                              <Folder size={10} />
                              <span>{sf.name}</span>
                              <span className="opacity-75">({sf.itemCount})</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 pt-1">
                        {filteredFolderItems.map((f, idx) => {
                          const fType = getFileType(f.extension, f.name);
                          return (
                            <div
                              key={f.id}
                              className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50 font-bold shrink-0">
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                <div className="p-1 rounded bg-slate-100 dark:bg-white/5 shrink-0">
                                  {renderFileIcon(f.extension, f.name)}
                                </div>
                                <div className="min-w-0">
                                  <span className="truncate font-semibold text-slate-800 dark:text-white/80 block">
                                    {f.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-slate-400 dark:text-white/40 font-mono">
                                      {f.size ? formatSize(f.size) : ""} • {f.extension?.toUpperCase() || fType.toUpperCase()}
                                    </span>
                                    {f.subfolder && (
                                      <span className="px-1.5 py-0.2 rounded bg-accent-soft text-accent-primary border border-accent-border font-semibold text-[9px] flex items-center gap-1">
                                        <Folder size={9} />
                                        <span>{f.subfolder}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <button
                                  onClick={() => copyToClipboard(f.streamUrl, `clip-stream-${f.id}`)}
                                  className="px-2 py-1 rounded-md bg-accent-soft hover:bg-accent-soft/80 text-accent-primary text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  {copiedKey === `clip-stream-${f.id}` ? "Copied CDN" : "Copy CDN"}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(f.iframeCode, `clip-frame-${f.id}`)}
                                  className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white/70 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  {copiedKey === `clip-frame-${f.id}` ? "Copied iFrame" : "Copy iFrame"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Single File Snippets */
                <>
                  {/* Responsive iFrame / Tag Embed */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        {activeFileType === "image" ? "1. Native Image Tag (HTML)" : "1. Responsive iFrame Embed (Universally Compatible)"}
                      </span>
                      <button
                        onClick={() => copyToClipboard(activeFileType === "image" ? currentVideoTag : currentEmbedCode, "iframe")}
                        className="flex items-center gap-1 text-xs text-accent-primary hover:underline font-semibold cursor-pointer"
                      >
                        {copiedKey === "iframe" ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedKey === "iframe" ? "Copied!" : activeFileType === "image" ? "Copy <img> Tag" : "Copy iFrame"}</span>
                      </button>
                    </div>
                    <div className="p-3 bg-black/60 rounded-xl font-mono text-[11px] text-white/70 overflow-x-auto select-all">
                      {(activeFileType === "image" ? currentVideoTag : currentEmbedCode) || "Enable public access to generate embed code."}
                    </div>
                  </div>

                  {/* Direct CDN Stream URL */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        2. Direct Edge Stream URL ($0 Egress B2 + Range Streaming)
                      </span>
                      <button
                        onClick={() => copyToClipboard(currentActiveStreamUrl, "url")}
                        className="flex items-center gap-1 text-xs text-accent-primary hover:underline font-semibold cursor-pointer"
                      >
                        {copiedKey === "url" ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedKey === "url" ? "Copied!" : "Copy Stream URL"}</span>
                      </button>
                    </div>
                    <div className="p-3 bg-black/60 rounded-xl font-mono text-[11px] text-white/70 overflow-x-auto select-all">
                      {currentActiveStreamUrl || "Enable public access to generate stream URL."}
                    </div>
                  </div>

                  {/* HTML5 Native Element Tag */}
                  {activeFileType !== "image" && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          3. Native HTML5 Element ({activeFileType === "audio" ? "<audio>" : "<video>"})
                        </span>
                        <button
                          onClick={() => copyToClipboard(currentVideoTag, "videotag")}
                          className="flex items-center gap-1 text-xs text-accent-primary hover:underline font-semibold cursor-pointer"
                        >
                          {copiedKey === "videotag" ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedKey === "videotag" ? "Copied!" : "Copy Tag"}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-black/60 rounded-xl font-mono text-[11px] text-white/70 overflow-x-auto select-all">
                        {currentVideoTag || "Enable public access to generate tag."}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Fixed Pinned Modal Footer (Never overlaps content or controls!) ── */}
        <div className="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/95 dark:bg-vault-surface/95 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-2">
            {copiedKey === "saved" && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle size={14} /> Settings Saved & Synced to Edge!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold">
              Close
            </Button>
            <Button
              onClick={() => handleSaveConfig(enabled)}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold shadow-accent-glow"
            >
              {saving ? "Saving Changes..." : "Save & Update Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
