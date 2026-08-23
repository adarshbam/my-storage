import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  Folder,
  ExternalLink,
  Info,
  RotateCcw,
  Copy,
  Scissors,
  Share2,
  Star,
  FolderPlus,
  History,
} from "lucide-react";
import getFileImage, { renderFileIcon } from "../../lib/FileImages";
import { formatSize, isSpecialFolder } from "../../lib/utils";
import {
  EncryptionBadgeIcon,
  VaultDriveIcon,
  VaultGitIcon,
} from "../ui/VaultIcons";
import { motion } from "framer-motion";
import { SERVER_URL } from "../../lib/api";
import { usePlan } from "../../context/PlanContext";
import Skeleton from "../ui/Skeleton";
import { prefetchFileContent } from "../../lib/fileCache";
import { useThumbnailUrl } from "../../lib/thumbnailCache";

const formatRelativeTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 10) return "just now";
  if (diffSecs < 60) return `${diffSecs} secs ago`;
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} mins ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 365) return `${diffDays} days ago`;
  
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} years ago`;
};

const getItemTypeInfo = (item, isDirectory, provider, specialView) => {
  if (!isDirectory) {
    return {
      typeLabel: formatSize(item.size),
      listLabel: formatSize(item.size),
      badgeLabel: provider === "local" ? "VAULT NODE" : provider.replace("_", " ").toUpperCase(),
    };
  }

  // 1. Vault Root Mount Points (When on Vault root and item is an external integration mount)
  if (!specialView) {
    if (provider === "google_drive" || item.name === "Google Drive") {
      return {
        typeLabel: "DRIVE LINK",
        listLabel: "Google Drive Link",
        badgeLabel: "GOOGLE DRIVE",
      };
    }
    if (provider === "github" || item.name === "Github" || item.name === "GitHub") {
      return {
        typeLabel: "GITHUB LINK",
        listLabel: "GitHub Link",
        badgeLabel: "GITHUB",
      };
    }
  }

  // 2. GitHub Integration Views
  if (provider === "github" || specialView === "github" || specialView === "github-repo") {
    const pathParts = (item.githubPath || "").split("/").filter(Boolean);
    // Subfolder inside a repository has > 2 segments (e.g. owner/repo/folder)
    const isSubfolder = specialView === "github-repo" || pathParts.length > 2;
    if (isSubfolder) {
      return {
        typeLabel: "DIRECTORY",
        listLabel: "Directory",
        badgeLabel: "GITHUB",
      };
    }
    return {
      typeLabel: item.private ? "PRIVATE REPO" : "REPOSITORY",
      listLabel: item.private ? "Private Repository" : "Repository",
      badgeLabel: "GITHUB",
    };
  }

  // 3. Google Drive Integration Views
  if (provider === "google_drive" || specialView === "google-drive" || specialView === "google-drive-folder") {
    if (specialView === "google-drive-folder") {
      return {
        typeLabel: "SUBFOLDER",
        listLabel: "Subfolder",
        badgeLabel: "GOOGLE DRIVE",
      };
    }
    return {
      typeLabel: "DRIVE FOLDER",
      listLabel: "Drive Folder",
      badgeLabel: "GOOGLE DRIVE",
    };
  }

  // 4. Local Vault Directories
  const count =
    item.itemCount !== undefined
      ? item.itemCount
      : item.items !== undefined
        ? item.items
        : (item.filesCount !== undefined || item.directoriesCount !== undefined)
          ? (item.filesCount || 0) + (item.directoriesCount || 0)
          : (item.files?.length || 0) + (item.directories?.length || 0);

  return {
    typeLabel: `${count} ITEMS`,
    listLabel: `${count} Assets`,
    badgeLabel: "VAULT NODE",
  };
};

export default function AssetCard({
  item,
  selected,
  onSelect,
  onNavigate,
  onPreview,
  viewMode = "grid",
  isTrash = false,
  onRename,
  onDelete,
  onDownload,
  onRestore,
  onStarred,
  onDeleteForever,
  onDetails,
  readOnly = false,
  isCut = false,
  onCopy = null,
  onCut = null,
  onDragStart = null,
  onDragOver = null,
  onDragLeave = null,
  onDrop = null,
  isDragOver = false,
  isBeingDragged = false,
  onDragEnd = null,
  onShare = null,
  onViewHistory = null,
  specialView = null,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { thumbnailUrl, error: thumbCdnError } = useThumbnailUrl(item);
  const [thumbSrc, setThumbSrc] = useState(thumbnailUrl);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setThumbSrc(thumbnailUrl);
    setTriedFallback(false);
    setImageError(false);
    setImageLoaded(false);
  }, [thumbnailUrl]);

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const { isNoPlan, rules } = usePlan();
  const planAllowsMutation = !isNoPlan && (rules?.permissions?.allowUpload ?? true);
  const effectiveReadOnly = readOnly || !planAllowsMutation;

  const provider = item.provider || "local";
  const isDirectory = item.type === "directory" || provider === "shared_drive";
  const isSpecial = isSpecialFolder(item);
  const typeInfo = getItemTypeInfo(item, isDirectory, provider, specialView);

  const handleImageError = () => {
    if (!triedFallback && item?._id && provider === "local") {
      setTriedFallback(true);
      setThumbSrc(`${SERVER_URL}/file/${item._id}/thumbnail`);
    } else {
      setImageError(true);
      setImageLoaded(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Environmental glow based on file type / provider
  let envClass = "env-glow-emerald";
  const ext = item.name.split(".").pop()?.toLowerCase() || "";
  if (provider === "google_drive" || provider === "shared_drive")
    envClass = "env-glow-cyan";
  else if (provider === "github") envClass = "env-glow-purple";
  else if (["pdf", "doc", "docx", "txt"].includes(ext))
    envClass = "env-glow-cyan";
  else if (["png", "jpg", "jpeg", "mp4", "mov"].includes(ext))
    envClass = "env-glow-orange";
  else if (["csv", "xlsx", "json"].includes(ext)) envClass = "env-glow-gold";
  else if (["js", "py", "ts", "jsx", "tsx", "html", "css"].includes(ext))
    envClass = "env-glow-emerald";
  if (item.isStarred || item.starred) envClass = "env-glow-orange";
  if (isTrash) envClass = "env-glow-rose";

  const handleDoubleClick = (e) => {
    e.preventDefault();
    if (isTrash) return;
    if (isDirectory) {
      if (onNavigate) onNavigate(item);
    } else {
      if (onPreview) onPreview(item);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(item, e);
  };

  const closeMenu = () => setShowMenu(false);

  // ─── List View ────────────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <div
        id={`file-card-${item._id}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => {
          setIsHovered(true);
          if (!isDirectory && item) prefetchFileContent(item);
        }}
        onMouseLeave={() => setIsHovered(false)}
        draggable={!readOnly && !isTrash && !isSpecial}
        onDragStart={(e) => onDragStart && onDragStart(e, item)}
        onDragEnd={(e) => onDragEnd && onDragEnd(e, item)}
        onDragOver={(e) => onDragOver && onDragOver(e)}
        onDragLeave={(e) => onDragLeave && onDragLeave(e)}
        onDrop={(e) => onDrop && onDrop(e, item)}
        className={`
          vault-card-interactive group relative flex items-center p-3 rounded-2xl border transition-all duration-150 select-none
          ${
            isDragOver
              ? "bg-accent-primary/20 dark:bg-emerald-950/70 border-2 border-accent-primary dark:border-emerald-400 ring-4 ring-accent-primary/60 shadow-[0_0_40px_rgba(16,185,129,0.85),0_0_80px_rgba(16,185,129,0.45),inset_0_0_20px_rgba(16,185,129,0.3)] scale-[1.03] z-30"
              : "bg-white dark:bg-vault-surface/80 border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-md"
          }
          ${selected && !isDragOver ? "ring-2 ring-accent-primary bg-accent-soft/30 dark:bg-accent-soft/20 border-accent-border shadow-md" : !isDragOver ? "hover:bg-slate-50/90 dark:hover:bg-vault-surface hover:border-slate-300 dark:hover:border-white/20" : ""}
          ${isCut ? "opacity-35" : ""}
          ${isBeingDragged ? "opacity-40 scale-95 border-dashed border-accent-primary/60" : ""}
        `}
      >
        {/* Exaggerated Glow / Drop Target Overlay for List */}
        {isDragOver && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-dashed border-accent-primary z-40 flex items-center justify-end pr-4 bg-accent-primary/10 backdrop-blur-[1px] animate-pulse">
            <div className="px-3 py-1 rounded-full bg-black/90 border border-accent-primary text-accent-primary text-xs font-mono font-bold tracking-wider shadow-[0_0_20px_var(--accent-glow)] flex items-center gap-1.5 animate-bounce">
              <FolderPlus size={14} />
              <span>DROP HERE</span>
            </div>
          </div>
        )}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all duration-300 ${
            selected || isHovered
              ? envClass.replace("env-glow-", "bg-")
              : "bg-transparent"
          }`}
        />

        <div className="w-10 h-10 rounded-lg bg-vault-black border border-white/10 flex items-center justify-center shrink-0 mr-4">
          {isDirectory ? (
            provider === "google_drive" ? (
              <VaultDriveIcon size={20} className="text-document-accent" />
            ) : provider === "github" ? (
              <VaultGitIcon size={20} className="text-slate-800 dark:text-white" />
            ) : (
              <Folder size={20} className="text-vault-emerald" />
            )
          ) : (
            renderFileIcon(ext, { size: 20 })
          )}
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">
            {item.name}
          </p>
          <p className="text-slate-500 dark:text-white/40 text-xs mt-0.5 truncate flex items-center gap-2">
            <span>{typeInfo.listLabel}</span>
            <span className="opacity-70">
              • {typeInfo.badgeLabel}
            </span>
            {item.openedAt && (
              <span className="text-teal-600 dark:text-teal-400 font-semibold font-mono">
                • Opened {formatRelativeTime(item.openedAt)}
              </span>
            )}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-white/30 mr-6">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/60">
            <EncryptionBadgeIcon size={12} className="text-vault-emerald" />
            <span>AES-256</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="status-dot status-dot-emerald" />
            <span className="text-[10px] text-slate-500 dark:text-white/50">Encrypted</span>
          </div>
          {(item.isShared || provider !== "local") && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-purple" />
              <span className="text-[10px] text-white/50">Shared</span>
            </div>
          )}
          {(item.isStarred || item.starred) && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-orange" />
              <span className="text-[10px] text-white/50">Starred</span>
            </div>
          )}
          {isTrash && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-crimson" />
              <span className="text-[10px] text-white/50">Expired</span>
            </div>
          )}
        </div>

        {/* Action buttons for list row */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isTrash && !isDirectory && onPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-all"
              title="Preview"
            >
              <ExternalLink size={16} />
            </button>
          )}
          {onDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetails(item);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-all"
              title="Details"
            >
              <Info size={16} />
            </button>
          )}
          {!isTrash && !effectiveReadOnly && !isSpecial && onRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename(item);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-black/40 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-all"
            >
              <Edit2 size={16} />
            </button>
          )}
          {!isTrash && onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(item);
              }}
              className="p-1.5 text-slate-400 hover:text-accent-primary bg-slate-100 dark:bg-black/40 hover:bg-accent-soft rounded-lg transition-all"
            >
              <Download size={16} />
            </button>
          )}
          {!isTrash && !effectiveReadOnly && !isSpecial && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-black/40 hover:bg-rose-500/10 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
          {isTrash && onRestore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(item);
              }}
              className="px-3 py-1.5 text-xs font-bold text-accent-primary bg-accent-soft hover:bg-accent-soft/80 rounded-lg transition-all uppercase tracking-wider"
            >
              Restore
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Grid View ────────────────────────────────────────────────────────────
  return (
    <motion.div
      layout
      id={`file-card-${item._id}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => {
        setIsHovered(true);
        if (!isDirectory && item) prefetchFileContent(item);
      }}
      onMouseLeave={() => setIsHovered(false)}
      draggable={!effectiveReadOnly && !isTrash && !isSpecial}
      onDragStart={(e) => onDragStart && onDragStart(e, item)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e, item)}
      onDragOver={(e) => onDragOver && onDragOver(e)}
      onDragLeave={(e) => onDragLeave && onDragLeave(e)}
      onDrop={(e) => onDrop && onDrop(e, item)}
      className={`
        vault-card-interactive group relative flex flex-col rounded-2xl transition-all duration-150 select-none
        ${
          isDragOver
            ? "bg-accent-primary/20 dark:bg-emerald-950/80 border-2 border-accent-primary dark:border-emerald-400 ring-4 ring-accent-primary/60 shadow-[0_0_50px_rgba(16,185,129,0.9),0_0_100px_rgba(16,185,129,0.5),inset_0_0_30px_rgba(16,185,129,0.35)] scale-[1.06] -translate-y-2 z-30"
            : "bg-white dark:bg-vault-surface/80 border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-xl dark:hover:shadow-black/60"
        }
        ${selected && !isDragOver ? `ring-2 ring-accent-primary bg-accent-soft/30 dark:bg-accent-soft/20 border-accent-border shadow-md` : !isDragOver ? "" : ""}
        ${isHovered && !selected && !isDragOver ? `border-slate-300 dark:border-white/25 ${envClass}` : ""}
        ${isCut ? "opacity-35" : ""}
        ${isBeingDragged ? "opacity-40 scale-95 border-dashed border-accent-primary/60" : ""}
      `}
    >
      {/* Exaggerated Glow / Drop Target Overlay for Grid */}
      {isDragOver && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-dashed border-accent-primary z-40 flex flex-col items-center justify-center bg-accent-primary/15 dark:bg-emerald-950/50 backdrop-blur-[2px] animate-pulse">
          <div className="px-4 py-2 rounded-full bg-black/90 border-2 border-accent-primary text-accent-primary text-xs font-mono font-black tracking-widest shadow-[0_0_30px_var(--accent-glow)] flex items-center gap-2 animate-bounce">
            <FolderPlus size={16} />
            <span>DROP TO MOVE</span>
          </div>
        </div>
      )}

      {/* ── Thumbnail ── (overflow-hidden stays, but menu is outside this div) */}
      <div className="relative aspect-[4/3] w-full bg-slate-50 dark:bg-black/40 rounded-t-2xl overflow-hidden border-b border-slate-200/70 dark:border-white/5">
        {/* Ambient glow */}
        <div
          className={`absolute inset-0 opacity-20 bg-gradient-radial to-transparent ${envClass
            .replace("env-glow-", "from-")
            .replace("-emerald", "vault-emerald")
            .replace("-accent", "")
            .replace("purple", "creative-accent")
            .replace("orange", "media-accent")
            .replace("gold", "analytics-accent")
            .replace("rose", "danger-accent")}`}
        />

        {/* File icon / thumbnail */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isDirectory ? (
            provider === "google_drive" ? (
              <VaultDriveIcon
                size={48}
                className="text-document-accent drop-shadow-[0_0_15px_rgba(77,166,255,0.4)]"
              />
            ) : provider === "github" ? (
              <VaultGitIcon
                size={48}
                className="text-slate-800 dark:text-white drop-shadow-[0_0_15px_rgba(198,92,255,0.4)]"
              />
            ) : (
              <Folder
                size={48}
                className="text-vault-emerald drop-shadow-[0_0_15px_rgba(0,212,165,0.4)]"
              />
            )
          ) : item.hasThumbnail && !imageError && thumbSrc ? (
            <>
              {!imageLoaded && (
                <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
              )}
              <img
                src={thumbSrc}
                alt="thumbnail"
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={handleImageError}
                loading="lazy"
                draggable={false}
              />
            </>
          ) : (
            renderFileIcon(ext, { size: 48, className: "drop-shadow-lg" })
          )}
        </div>

        {/* Badges — top-left, always visible */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
            <EncryptionBadgeIcon size={12} className="text-vault-emerald" />
            <span className="text-[10px] font-mono text-white/70">AES-256</span>
          </div>
          {(item.isStarred || item.starred) && (
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-[#FF7A3D]/10 backdrop-blur-md border border-[#FF7A3D]/30 text-[#FF7A3D] shadow-[0_0_10px_rgba(255,122,61,0.15)]">
              <Star size={10} fill="currentColor" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Starred</span>
            </div>
          )}
        </div>

        {/* ── 2 Quick-action buttons — bottom corners, show on hover ── */}
        <div
          className={`absolute inset-x-0 bottom-0 flex items-end justify-between p-1.5 gap-1.5 transition-all duration-200 ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview / Open / Restore — left */}
          {!isTrash && !isDirectory && onPreview ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-black/85 backdrop-blur-sm border border-white/20 text-white text-[10px] font-semibold transition-all hover:scale-[1.03] hover:bg-black"
              title="Preview"
            >
              <ExternalLink size={12} className="shrink-0" />
              Preview
            </button>
          ) : !isTrash && isDirectory && onNavigate ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(item);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-black/85 backdrop-blur-sm border border-white/20 text-white text-[10px] font-semibold transition-all hover:scale-[1.03] hover:bg-black"
              title="Open"
            >
              <ExternalLink size={12} className="shrink-0" />
              Open
            </button>
          ) : isTrash && onRestore ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(item);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-accent-primary text-accent-foreground backdrop-blur-sm border border-accent-border text-[10px] font-semibold transition-all hover:scale-[1.03] hover:opacity-90"
              title="Restore"
            >
              <RotateCcw size={12} className="shrink-0" />
              Restore
            </button>
          ) : (
            <span className="flex-1" />
          )}

          {/* Download — right */}
          {!isTrash && onDownload ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(item);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-accent-primary text-accent-foreground backdrop-blur-sm border border-accent-border text-[10px] font-semibold transition-all hover:scale-[1.03] hover:opacity-90"
              title="Download"
            >
              <Download size={12} className="shrink-0" />
              Download
            </button>
          ) : isTrash && onDeleteForever ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteForever(item);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-danger-accent/70 backdrop-blur-sm border border-danger-accent text-white text-[10px] font-semibold transition-all hover:scale-[1.03] hover:bg-danger-accent/90"
              title="Delete Forever"
            >
              <Trash2 size={12} className="shrink-0" />
              Forever
            </button>
          ) : (
            <span className="flex-1" />
          )}
        </div>
      </div>

      {/* ── ⋮ Menu — OUTSIDE overflow:hidden so dropdown never clips ── */}
      <div
        ref={menuRef}
        className="absolute top-2 right-2 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((v) => !v);
          }}
          className={`flex items-center justify-center w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm border border-white/15 text-white/70 hover:text-white hover:bg-black/80 transition-all duration-200 ${
            isHovered || showMenu
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95"
          }`}
          title="More actions"
        >
          <MoreVertical size={14} />
        </button>

        {/* Dropdown — unrestricted, renders from card root level */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 p-1.5 overflow-hidden text-slate-900 dark:text-white backdrop-blur-xl animate-fade-in">
            {/* Open / Preview */}
            {!isTrash && (
              <button
                onClick={() => {
                  closeMenu();
                  isDirectory ? onNavigate?.(item) : onPreview?.(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors rounded-xl"
              >
                <ExternalLink size={14} className="shrink-0 text-slate-500 dark:text-white/60" />
                {isDirectory ? "Open folder" : "Preview"}
              </button>
            )}
            {onDetails && (
              <button
                onClick={() => {
                  closeMenu();
                  onDetails(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors rounded-xl"
              >
                <Info size={14} className="shrink-0 text-slate-500 dark:text-white/60" />
                Details
              </button>
            )}

            {provider === "github" && !isDirectory && onViewHistory && (
              <button
                onClick={() => {
                  closeMenu();
                  onViewHistory(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors rounded-xl"
              >
                <History size={14} className="shrink-0 text-accent-primary" />
                Commit History
              </button>
            )}

            {!isTrash && !effectiveReadOnly && onStarred && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStarred(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors rounded-xl"
              >
                <Star
                  size={15}
                  fill={(item.isStarred || item.starred) ? "#FF7A3D" : "none"}
                  className={(item.isStarred || item.starred) ? "text-[#FF7A3D] drop-shadow-[0_0_8px_rgba(255,122,61,0.85)]" : "text-slate-400 dark:text-white/60"}
                />
                Priority
              </button>
            )}

            {!isTrash && !effectiveReadOnly && !isSpecial && onRename && (
              <button
                onClick={() => {
                  closeMenu();
                  onRename(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors rounded-xl"
              >
                <Edit2 size={14} className="shrink-0 text-slate-500 dark:text-white/60" />
                Rename
              </button>
            )}
            {!isTrash && !effectiveReadOnly && onShare && (
              <button
                onClick={() => {
                  closeMenu();
                  onShare(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors rounded-xl"
              >
                <Share2 size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />
                Share
              </button>
            )}
            {!isTrash && !effectiveReadOnly && !isSpecial && onCopy && (
              <button
                onClick={() => {
                  closeMenu();
                  onCopy(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors rounded-xl"
              >
                <Copy size={14} className="shrink-0 text-slate-500 dark:text-white/60" />
                Copy
              </button>
            )}
            {!isTrash && !effectiveReadOnly && !isSpecial && onCut && (
              <button
                onClick={() => {
                  closeMenu();
                  onCut(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors rounded-xl"
              >
                <Scissors size={14} className="shrink-0 text-slate-500 dark:text-white/60" />
                Cut
              </button>
            )}
            {!isTrash && onDownload && (
              <button
                onClick={() => {
                  closeMenu();
                  onDownload(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-accent-primary hover:bg-accent-soft transition-colors rounded-xl"
              >
                <Download size={14} className="shrink-0 text-accent-primary" />
                Download
              </button>
            )}
            {isTrash && onRestore && (
              <button
                onClick={() => {
                  closeMenu();
                  onRestore(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-accent-primary hover:bg-accent-soft transition-colors rounded-xl"
              >
                <RotateCcw size={14} className="shrink-0 text-accent-primary" />
                Restore
              </button>
            )}
            {/* Separator */}
            {((!isTrash && !effectiveReadOnly && !isSpecial && onDelete) ||
              (isTrash && onDeleteForever)) && (
              <div className="my-1 mx-2 border-t border-slate-100 dark:border-white/[0.08]" />
            )}
            {!isTrash && !effectiveReadOnly && !isSpecial && onDelete && (
              <button
                onClick={() => {
                  closeMenu();
                  onDelete(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors rounded-xl"
              >
                <Trash2 size={14} className="shrink-0" />
                Delete
              </button>
            )}
            {isTrash && onDeleteForever && (
              <button
                onClick={() => {
                  closeMenu();
                  onDeleteForever(item);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors rounded-xl"
              >
                <Trash2 size={14} className="shrink-0" />
                Delete Forever
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Metadata ── */}

      <div className="p-4 flex flex-col gap-1 min-w-0">
        <h3
          className="text-slate-900 dark:text-white font-semibold text-sm truncate"
          title={item.name}
        >
          {item.name}
        </h3>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-white/40 gap-2">
          <span className="truncate min-w-0 font-medium">
            {typeInfo.typeLabel}
          </span>
          <span className="uppercase whitespace-nowrap shrink-0 tracking-wider text-[10px] text-slate-600 dark:text-white/50 bg-slate-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
            {typeInfo.badgeLabel}
          </span>
        </div>
        {item.openedAt && (
          <div className="text-[10px] text-teal-600 dark:text-teal-400 font-mono font-semibold tracking-wide mt-0.5">
            Opened {formatRelativeTime(item.openedAt)}
          </div>
        )}
        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="status-dot status-dot-emerald" />
            <span className="text-[10px] text-slate-500 dark:text-white/50">Encrypted</span>
          </div>
          {(item.isShared || provider !== "local") && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-purple" />
              <span className="text-[10px] text-slate-500 dark:text-white/50">Shared</span>
            </div>
          )}
          {(item.isStarred || item.starred) && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-orange" />
              <span className="text-[10px] text-slate-500 dark:text-white/50">Starred</span>
            </div>
          )}
          {isTrash && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-crimson" />
              <span className="text-[10px] text-slate-500 dark:text-white/50">Expired</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Selected checkmark ── */}
      {selected && (
        <div
          className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white/20 dark:border-vault-surface z-10 shadow-lg ${
            isTrash
              ? "bg-danger-accent shadow-[0_0_15px_rgba(255,90,122,0.6)] text-white"
              : provider === "github" || item.name?.toLowerCase() === "github"
                ? "bg-linkgit-accent shadow-[0_0_15px_rgba(198,92,255,0.6)] text-white"
                : provider === "google_drive" || provider === "shared_drive" || item.name?.toLowerCase() === "google drive"
                  ? "bg-[#00CFFF] shadow-[0_0_15px_rgba(0,207,255,0.6)] text-slate-950"
                  : "bg-accent-primary shadow-accent-glow-sm text-accent-foreground"
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
