import { useState } from "react";
import { MoreVertical, Download, Edit2, Trash2, Folder, ExternalLink, Info } from "lucide-react";
import getFileImage from "../../lib/FileImages";
import { formatSize } from "../../lib/utils";
import { EncryptionBadgeIcon, VaultDriveIcon, VaultGitIcon } from "../ui/VaultIcons";
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
  const provider = item.provider || "local";
  const isDirectory = item.type === "directory" || provider === "shared_drive";

  // Determine environmental lighting and theme based on file type / provider
  let envClass = "env-glow-emerald";
  let ext = item.name.split('.').pop()?.toLowerCase() || "";
  if (provider === "google_drive" || provider === "shared_drive") envClass = "env-glow-azure";
  else if (provider === "github") envClass = "env-glow-purple";
  else if (["pdf", "doc", "docx", "txt"].includes(ext)) envClass = "env-glow-azure";
  else if (["png", "jpg", "jpeg", "mp4", "mov"].includes(ext)) envClass = "env-glow-orange";
  else if (["csv", "xlsx", "json"].includes(ext)) envClass = "env-glow-gold";
  else if (["js", "py", "ts", "jsx", "tsx", "html", "css"].includes(ext)) envClass = "env-glow-emerald";

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

  if (viewMode === "list") {
    return (
      <div
        id={`file-card-${item.id}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          group relative flex items-center p-3 rounded-xl border border-white/5 transition-all duration-300
          ${selected ? 'bg-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]' : 'hover:bg-white/[0.03]'}
        `}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all duration-300 ${selected || isHovered ? envClass.replace('env-glow-', 'bg-') : 'bg-transparent'}`} />
        
        <div className="w-10 h-10 rounded-lg bg-vault-black border border-white/10 flex items-center justify-center shrink-0 mr-4 relative">
          {isDirectory ? (
             provider === "google_drive" ? <VaultDriveIcon size={20} className="text-document-accent" /> :
             provider === "github" ? <VaultGitIcon size={20} className="text-creative-accent" /> :
             <Folder size={20} className="text-vault-emerald" />
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
               <span className="opacity-70 flex items-center gap-1">
                 • {provider.replace('_', ' ').toUpperCase()}
               </span>
            )}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-white/30 mr-6">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/10">
            <EncryptionBadgeIcon size={12} className="text-vault-emerald" />
            <span>AES-256</span>
          </div>
        </div>

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

  // Grid View
  return (
    <motion.div
      layout
      id={`file-card-${item.id}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative flex flex-col rounded-2xl transition-all duration-300 asset-card-hover select-none
        ${selected ? `bg-white/[0.08] ${envClass}` : 'bg-vault-surface/60 border border-white/5'}
        ${isHovered && !selected ? `border-white/20 ${envClass}` : ''}
      `}
    >
      {/* Aspect Ratio Container for Preview */}
      <div className="relative aspect-[4/3] w-full bg-black/40 rounded-t-2xl overflow-hidden border-b border-white/5">
        
        {/* Background ambient glow in preview */}
        <div className={`absolute inset-0 opacity-20 bg-gradient-radial to-transparent ${envClass.replace('env-glow-', 'from-').replace('-accent', '').replace('-emerald', 'vault-emerald').replace('azure', 'document-accent').replace('purple', 'creative-accent').replace('orange', 'media-accent').replace('gold', 'analytics-accent').replace('rose', 'danger-accent')}`} />

        <div className="absolute inset-0 flex items-center justify-center">
          {isDirectory ? (
             provider === "google_drive" ? <VaultDriveIcon size={48} className="text-document-accent drop-shadow-[0_0_15px_rgba(77,166,255,0.4)]" /> :
             provider === "github" ? <VaultGitIcon size={48} className="text-creative-accent drop-shadow-[0_0_15px_rgba(198,92,255,0.4)]" /> :
             <Folder size={48} className="text-vault-emerald drop-shadow-[0_0_15px_rgba(0,212,165,0.4)]" />
          ) : (
             (item.hasThumbnail && !imageError) ? (
               <img
                  src={`${SERVER_URL}/file/${item.id}/thumbnail`}
                  alt="thumbnail"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  crossOrigin="use-credentials"
                  loading="lazy"
               />
             ) : (
               <img src={getFileImage(ext)} alt="icon" className="w-16 h-16 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" draggable={false} />
             )
          )}
        </div>

        {/* Security Badge Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10">
          <EncryptionBadgeIcon size={12} className="text-vault-emerald" />
          <span className="text-[10px] font-mono text-white/70">AES-256</span>
        </div>

        {/* Quick Actions Overlay (shows on hover) */}
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {!isTrash && !isDirectory && onPreview && (
             <button onClick={(e) => { e.stopPropagation(); onPreview(item); }} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all hover:scale-110" title="Preview">
               <ExternalLink size={18} />
             </button>
          )}
          {onDetails && (
             <button onClick={(e) => { e.stopPropagation(); onDetails(item); }} className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all hover:scale-110" title="Details">
               <Info size={18} />
             </button>
          )}
          {!isTrash && onDownload && (
             <button onClick={(e) => { e.stopPropagation(); onDownload(item); }} className="w-10 h-10 rounded-full bg-vault-emerald/20 border border-vault-emerald/50 flex items-center justify-center text-vault-emerald hover:bg-vault-emerald hover:text-black transition-all hover:scale-110">
               <Download size={18} />
             </button>
          )}
          {!isTrash && !readOnly && onDelete && (
             <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="w-10 h-10 rounded-full bg-danger-accent/20 border border-danger-accent/50 flex items-center justify-center text-danger-accent hover:bg-danger-accent hover:text-black transition-all hover:scale-110">
               <Trash2 size={18} />
             </button>
          )}
        </div>
      </div>

      {/* Metadata Row */}
      <div className="p-4 flex flex-col gap-1">
        <h3 className="text-white font-semibold text-sm truncate">{item.name}</h3>
        <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>{isDirectory ? `${item.itemCount || 0} ITEMS` : formatSize(item.size)}</span>
          <span className="uppercase">{provider === 'local' ? 'VAULT NODE' : provider.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Selected checkmark indicator */}
      {selected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-vault-emerald text-vault-black flex items-center justify-center shadow-[0_0_15px_rgba(0,212,165,0.6)] border-2 border-vault-surface z-10">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      )}
    </motion.div>
  );
}
