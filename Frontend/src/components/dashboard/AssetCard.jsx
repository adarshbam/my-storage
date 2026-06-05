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
} from "lucide-react";
import getFileImage from "../../lib/FileImages";
import { formatSize } from "../../lib/utils";
import {
  EncryptionBadgeIcon,
  VaultDriveIcon,
  VaultGitIcon,
} from "../ui/VaultIcons";
import { motion } from "framer-motion";
import { SERVER_URL } from "../../lib/api";

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
  onDeleteForever,
  onDetails,
  readOnly = false,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const provider = item.provider || "local";
  const isDirectory = item.type === "directory" || provider === "shared_drive";

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
  if (provider === "google_drive" || provider === "shared_drive") envClass = "env-glow-cyan";
  else if (provider === "github") envClass = "env-glow-purple";
  else if (["pdf", "doc", "docx", "txt"].includes(ext)) envClass = "env-glow-cyan";
  else if (["png", "jpg", "jpeg", "mp4", "mov"].includes(ext)) envClass = "env-glow-orange";
  else if (["csv", "xlsx", "json"].includes(ext)) envClass = "env-glow-gold";
  else if (["js", "py", "ts", "jsx", "tsx", "html", "css"].includes(ext)) envClass = "env-glow-emerald";
  if (isTrash) envClass = "env-glow-rose";

  const handleDoubleClick = (e) => {
    e.preventDefault();
    if (isTrash) return;
    if (isDirectory) { if (onNavigate) onNavigate(item); }
    else { if (onPreview) onPreview(item); }
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          group relative flex items-center p-3 rounded-xl border border-white/5 transition-all duration-300
          ${selected ? "bg-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]" : "hover:bg-white/[0.03]"}
        `}
      >
        <div
          className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300 ${
            selected || isHovered ? envClass.replace("env-glow-", "bg-") : "bg-transparent"
          }`}
        />

        <div className="w-10 h-10 rounded-lg bg-vault-black border border-white/10 flex items-center justify-center shrink-0 mr-4">
          {isDirectory ? (
            provider === "google_drive" ? <VaultDriveIcon size={20} className="text-document-accent" />
            : provider === "github" ? <VaultGitIcon size={20} className="text-creative-accent" />
            : <Folder size={20} className="text-vault-emerald" />
          ) : (
            <img src={getFileImage(ext)} alt="icon" className="w-6 h-6 object-contain drop-shadow-lg" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <p className="text-white font-semibold text-sm truncate">{item.name}</p>
          <p className="text-white/40 text-xs mt-0.5 truncate flex items-center gap-2">
            {!isDirectory && <span>{formatSize(item.size)}</span>}
            {isDirectory && <span>{item.itemCount || 0} Assets</span>}
            {provider !== "local" && (
              <span className="opacity-70">• {provider.replace("_", " ").toUpperCase()}</span>
            )}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-white/30 mr-6">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/10">
            <EncryptionBadgeIcon size={12} className="text-vault-emerald" />
            <span>AES-256</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="status-dot status-dot-emerald" />
            <span className="text-[10px] text-white/50">Encrypted</span>
          </div>
          {(item.isShared || provider !== "local") && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-purple" />
              <span className="text-[10px] text-white/50">Shared</span>
            </div>
          )}
          {item.isStarred && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-gold" />
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
            <button onClick={(e) => { e.stopPropagation(); onPreview(item); }} className="p-1.5 text-white/40 hover:text-white bg-black/40 hover:bg-white/10 rounded-lg transition-all" title="Preview">
              <ExternalLink size={16} />
            </button>
          )}
          {onDetails && (
            <button onClick={(e) => { e.stopPropagation(); onDetails(item); }} className="p-1.5 text-white/40 hover:text-white bg-black/40 hover:bg-white/10 rounded-lg transition-all" title="Details">
              <Info size={16} />
            </button>
          )}
          {!isTrash && !readOnly && onRename && (
            <button onClick={(e) => { e.stopPropagation(); onRename(item); }} className="p-1.5 text-white/40 hover:text-white bg-black/40 hover:bg-white/10 rounded-lg transition-all">
              <Edit2 size={16} />
            </button>
          )}
          {!isTrash && onDownload && (
            <button onClick={(e) => { e.stopPropagation(); onDownload(item); }} className="p-1.5 text-white/40 hover:text-vault-emerald bg-black/40 hover:bg-vault-emerald/20 rounded-lg transition-all">
              <Download size={16} />
            </button>
          )}
          {!isTrash && !readOnly && onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="p-1.5 text-white/40 hover:text-danger-accent bg-black/40 hover:bg-danger-accent/20 rounded-lg transition-all">
              <Trash2 size={16} />
            </button>
          )}
          {isTrash && onRestore && (
            <button onClick={(e) => { e.stopPropagation(); onRestore(item); }} className="px-3 py-1.5 text-xs font-bold text-vault-emerald bg-vault-emerald/10 hover:bg-vault-emerald/20 rounded-lg transition-all uppercase tracking-wider">
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}

      className={`
        group relative flex flex-col rounded-2xl transition-all duration-300 asset-card-hover select-none
        ${selected ? `bg-white/[0.08] ${envClass}` : "bg-vault-surface/60 border border-white/5"}
        ${isHovered && !selected ? `border-white/20 ${envClass}` : ""}
      `}
    >
      {/* ── Thumbnail ── (overflow-hidden stays, but menu is outside this div) */}
      <div className="relative aspect-[4/3] w-full bg-black/40 rounded-t-2xl overflow-hidden border-b border-white/5">
        {/* Ambient glow */}
        <div className={`absolute inset-0 opacity-20 bg-gradient-radial to-transparent ${
          envClass.replace("env-glow-", "from-")
            .replace("-emerald", "vault-emerald")
            .replace("-accent", "")
            .replace("purple", "creative-accent")
            .replace("orange", "media-accent")
            .replace("gold", "analytics-accent")
            .replace("rose", "danger-accent")
        }`} />

        {/* File icon / thumbnail */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isDirectory ? (
            provider === "google_drive" ? (
              <VaultDriveIcon size={48} className="text-document-accent drop-shadow-[0_0_15px_rgba(77,166,255,0.4)]" />
            ) : provider === "github" ? (
              <VaultGitIcon size={48} className="text-creative-accent drop-shadow-[0_0_15px_rgba(198,92,255,0.4)]" />
            ) : (
              <Folder size={48} className="text-vault-emerald drop-shadow-[0_0_15px_rgba(0,212,165,0.4)]" />
            )
          ) : item.hasThumbnail && !imageError ? (
            <img
              src={`${SERVER_URL}/file/${item._id}/thumbnail`}
              alt="thumbnail"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              crossOrigin="use-credentials"
              loading="lazy"
            />
          ) : (
            <img
              src={getFileImage(ext)}
              alt="icon"
              className="w-16 h-16 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
              draggable={false}
            />
          )}
        </div>

        {/* AES-256 badge — top-left, always visible */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
          <EncryptionBadgeIcon size={12} className="text-vault-emerald" />
          <span className="text-[10px] font-mono text-white/70">AES-256</span>
        </div>

        {/* ── 2 Quick-action buttons — bottom corners, show on hover ── */}
        <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between p-1.5 gap-1.5 transition-all duration-200 ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview / Open / Restore — left */}
          {!isTrash && !isDirectory && onPreview ? (
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(item); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-black/85 backdrop-blur-sm border border-white/20 text-white text-[10px] font-semibold transition-all hover:scale-[1.03] hover:bg-black"
              title="Preview"
            >
              <ExternalLink size={12} className="shrink-0" />
              Preview
            </button>
          ) : !isTrash && isDirectory && onNavigate ? (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigate(item); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-black/85 backdrop-blur-sm border border-white/20 text-white text-[10px] font-semibold transition-all hover:scale-[1.03] hover:bg-black"
              title="Open"
            >
              <ExternalLink size={12} className="shrink-0" />
              Open
            </button>
          ) : isTrash && onRestore ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRestore(item); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-vault-emerald/70 backdrop-blur-sm border border-vault-emerald text-white text-[10px] font-semibold transition-all hover:scale-[1.03] hover:bg-vault-emerald/90"
              title="Restore"
            >
              <RotateCcw size={12} className="shrink-0" />
              Restore
            </button>
          ) : <span className="flex-1" />}

          {/* Download — right (solid green) */}
          {!isTrash && onDownload ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(item); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-vault-emerald/70 backdrop-blur-sm border border-vault-emerald text-white text-[10px] font-semibold transition-all hover:scale-[1.03] hover:bg-vault-emerald/90"
              title="Download"
            >
              <Download size={12} className="shrink-0" />
              Download
            </button>
          ) : isTrash && onDeleteForever ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteForever(item); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-danger-accent/70 backdrop-blur-sm border border-danger-accent text-white text-[10px] font-semibold transition-all hover:scale-[1.03] hover:bg-danger-accent/90"
              title="Delete Forever"
            >
              <Trash2 size={12} className="shrink-0" />
              Forever
            </button>
          ) : <span className="flex-1" />}
        </div>

      </div>

      {/* ── ⋮ Menu — OUTSIDE overflow:hidden so dropdown never clips ── */}
      <div
        ref={menuRef}
        className="absolute top-2 right-2 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
          className={`flex items-center justify-center w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm border border-white/15 text-white/70 hover:text-white hover:bg-black/80 transition-all duration-200 ${
            isHovered || showMenu ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
          title="More actions"
        >
          <MoreVertical size={14} />
        </button>

        {/* Dropdown — unrestricted, renders from card root level */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#111113] border border-white/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-50 py-1">
            {/* Open / Preview */}
            {!isTrash && (
              <button
                onClick={() => { closeMenu(); isDirectory ? onNavigate?.(item) : onPreview?.(item); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/80 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                <ExternalLink size={14} className="shrink-0" />
                {isDirectory ? "Open folder" : "Preview"}
              </button>
            )}
            {onDetails && (
              <button
                onClick={() => { closeMenu(); onDetails(item); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/80 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                <Info size={14} className="shrink-0" />
                Details
              </button>
            )}
            {!isTrash && !readOnly && onRename && (
              <button
                onClick={() => { closeMenu(); onRename(item); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/80 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                <Edit2 size={14} className="shrink-0" />
                Rename
              </button>
            )}
            {!isTrash && onDownload && (
              <button
                onClick={() => { closeMenu(); onDownload(item); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-vault-emerald hover:bg-vault-emerald/10 transition-colors"
              >
                <Download size={14} className="shrink-0" />
                Download
              </button>
            )}
            {isTrash && onRestore && (
              <button
                onClick={() => { closeMenu(); onRestore(item); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-vault-emerald hover:bg-vault-emerald/10 transition-colors"
              >
                <RotateCcw size={14} className="shrink-0" />
                Restore
              </button>
            )}
            {/* Separator */}
            {((!isTrash && !readOnly && onDelete) || (isTrash && onDeleteForever)) && (
              <div className="my-1 mx-3 border-t border-white/[0.08]" />
            )}
            {!isTrash && !readOnly && onDelete && (
              <button
                onClick={() => { closeMenu(); onDelete(item); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-danger-accent hover:bg-danger-accent/10 transition-colors"
              >
                <Trash2 size={14} className="shrink-0" />
                Delete
              </button>
            )}
            {isTrash && onDeleteForever && (
              <button
                onClick={() => { closeMenu(); onDeleteForever(item); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-danger-accent hover:bg-danger-accent/10 transition-colors"
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
        <h3 className="text-white font-semibold text-sm truncate" title={item.name}>{item.name}</h3>
        <div className="flex items-center justify-between text-[11px] font-mono text-white/40 gap-2">
          <span className="truncate min-w-0">{isDirectory ? `${item.itemCount || 0} ITEMS` : formatSize(item.size)}</span>
          <span className="uppercase whitespace-nowrap shrink-0">
            {provider === "local" ? "VAULT NODE" : provider.replace("_", " ")}
          </span>
        </div>
        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="status-dot status-dot-emerald" />
            <span className="text-[10px] text-white/50">Encrypted</span>
          </div>
          {(item.isShared || provider !== "local") && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-purple" />
              <span className="text-[10px] text-white/50">Shared</span>
            </div>
          )}
          {item.isStarred && (
            <div className="flex items-center gap-1">
              <div className="status-dot status-dot-gold" />
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
      </div>

      {/* ── Selected checkmark ── */}
      {selected && (
        <div
          className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-vault-black flex items-center justify-center border-2 border-vault-surface z-10 ${
            isTrash ? "bg-danger-accent shadow-[0_0_15px_rgba(255,90,122,0.6)]"
            : provider === "github" ? "bg-creative-accent shadow-[0_0_15px_rgba(198,92,255,0.6)]"
            : provider === "google_drive" || provider === "shared_drive" ? "shadow-[0_0_15px_rgba(0,207,255,0.6)]"
            : "bg-vault-emerald shadow-[0_0_15px_rgba(0,212,165,0.6)]"
          }`}
          style={
            (provider === "google_drive" || provider === "shared_drive") && !isTrash
              ? { backgroundColor: "#00CFFF" } : undefined
          }
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
