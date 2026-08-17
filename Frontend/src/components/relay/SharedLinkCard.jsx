import { useState } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Lock,
  Globe,
  Shield,
  ShieldAlert,
  Ban,
  Clock,
  Eye,
  Download,
  MoreVertical,
  Edit2,
  QrCode,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code2,
  Folder,
  Layers,
} from "lucide-react";
import { formatSize } from "../../lib/utils";

// Helper to determine icon & style based on item type and extension
function getItemVisual(item, items = []) {
  if (!item && (!items || items.length === 0)) {
    return {
      Icon: Layers,
      bg: "bg-relay-accent/10",
      text: "text-relay-accent",
      border: "border-relay-accent/25",
      typeLabel: "Vault Node",
    };
  }

  if (items && items.length > 1) {
    return {
      Icon: Layers,
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
      border: "border-indigo-500/25",
      typeLabel: `${items.length} Items`,
    };
  }

  const singleItem = item || (items && items[0]);
  if (!singleItem) {
    return {
      Icon: Layers,
      bg: "bg-relay-accent/10",
      text: "text-relay-accent",
      border: "border-relay-accent/25",
      typeLabel: "Vault Node",
    };
  }

  if (singleItem.type === "directory") {
    return {
      Icon: Folder,
      bg: "bg-accent-soft",
      text: "text-accent-primary",
      border: "border-accent-border",
      typeLabel: "Folder",
    };
  }

  const ext = (singleItem.extension || singleItem.name?.split(".").pop() || "").toLowerCase();
  
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "avif"].some(e => ext.includes(e))) {
    return {
      Icon: ImageIcon,
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/25",
      typeLabel: "Image",
    };
  }
  if (["mp4", "mkv", "mov", "webm", "avi"].some(e => ext.includes(e))) {
    return {
      Icon: Film,
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/25",
      typeLabel: "Video",
    };
  }
  if (["mp3", "wav", "ogg", "flac", "m4a", "aac"].some(e => ext.includes(e))) {
    return {
      Icon: Music,
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/25",
      typeLabel: "Audio",
    };
  }
  if (["zip", "rar", "7z", "tar", "gz"].some(e => ext.includes(e))) {
    return {
      Icon: Archive,
      bg: "bg-pink-500/10",
      text: "text-pink-400",
      border: "border-pink-500/25",
      typeLabel: "Archive",
    };
  }
  if (["js", "jsx", "ts", "tsx", "py", "html", "css", "json", "c", "cpp", "java", "sql"].some(e => ext.includes(e))) {
    return {
      Icon: Code2,
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/25",
      typeLabel: "Code",
    };
  }

  return {
    Icon: FileText,
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/25",
    typeLabel: "Document",
  };
}

export default function SharedLinkCard({
  link,
  onToggleActive,
  onEdit,
  onShowQR,
  onRevoke,
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryItem = link.items && link.items.length > 0 ? link.items[0] : null;
  const isMulti = link.items && link.items.length > 1;
  const displayName = link.title || (isMulti ? `${link.items[0].name} +${link.items.length - 1} more` : primaryItem ? primaryItem.name : "Entire Vault Node");
  
  const totalSize = (link.items && link.items.length > 0)
    ? link.items.reduce((acc, curr) => acc + (curr.size || 0), 0)
    : (link.size || link.vaultSize || 0);
  const formattedSize = totalSize > 0 ? formatSize(totalSize) : "0 B";
  
  const formattedDate = link.createdAt
    ? new Date(link.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recent";

  const visual = getItemVisual(primaryItem, link.items);
  const VisualIcon = visual.Icon;

  const isExpired = link.isExpired || (link.expiresAt && new Date(link.expiresAt) < new Date());
  const isActive = link.isActive && !isExpired;

  const shareUrl = `${window.location.origin}/shared-access/${link.token}`;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = (e) => {
    e.stopPropagation();
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const permissionType = link.permission && link.permission.includes("owner")
    ? "owner"
    : link.permission && link.permission.includes("write")
    ? "write"
    : "read";

  return (
    <div className={`relative group rounded-3xl p-5 transition-all duration-300 flex flex-col justify-between border ${
      isActive 
        ? "bg-white dark:bg-vault-surface/90 hover:bg-slate-50 dark:hover:bg-vault-surface border-slate-200 dark:border-white/5 hover:border-accent-border shadow-sm hover:shadow-md"
        : "bg-slate-50 dark:bg-vault-surface/40 border-slate-200 dark:border-white/5 opacity-70 hover:opacity-100"
    } vault-card-interactive text-slate-900 dark:text-white`}>
      
      {/* Top Section: Icon, Name & Menu */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          {/* File/Type Icon Badge */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${visual.bg} ${visual.text} ${visual.border} shadow-sm`}>
            <VisualIcon size={22} />
          </div>

          {/* Action Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="More options"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-vault-panel/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-0.5 animate-fade-in text-slate-900 dark:text-white">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(link);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-left"
                  >
                    <Edit2 size={13} className="text-accent-primary" />
                    Edit Settings
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onShowQR(shareUrl, displayName);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-left"
                  >
                    <QrCode size={13} className="text-pulse-accent" />
                    Show QR Code
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleActive(link._id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left"
                  >
                    <Ban size={13} className={link.isActive ? "text-amber-400" : "text-emerald-400"} />
                    {link.isActive ? "Disable Link" : "Activate Link"}
                  </button>
                  <div className="my-1 border-t border-white/5" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRevoke(link._id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-danger-accent hover:bg-danger-accent/10 rounded-xl transition-colors text-left"
                  >
                    <Trash2 size={13} />
                    Revoke & Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          className="font-bold text-white text-base truncate mb-1"
          title={displayName}
        >
          {displayName}
        </h3>

        {/* Metadata Line (Size • Date) */}
        <div className="flex items-center gap-2 text-xs text-white/40 mb-3 font-medium">
          <span>{formattedSize}</span>
          <span>•</span>
          <span>{formattedDate}</span>
        </div>

        {/* Status Badges / Pills Row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {/* Active / Disabled / Expired Pill */}
          {isExpired ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Clock size={11} /> Expired
            </span>
          ) : link.isActive ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe size={11} /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 text-white/40 border border-white/10">
              <Ban size={11} /> Disabled
            </span>
          )}

          {/* Access / Clearance Pill */}
          {link.accessType === "public" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Globe size={11} /> Public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <Shield size={11} /> Restricted
            </span>
          )}

          {/* Password Pill */}
          {link.hasPassword && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Lock size={11} /> Password
            </span>
          )}

          {/* Permission Level Pill */}
          {permissionType === "owner" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-danger-accent/10 text-danger-accent border border-danger-accent/20">
              <ShieldAlert size={11} /> Full Admin
            </span>
          ) : permissionType === "write" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-media-accent/10 text-media-accent border border-media-accent/20">
              Read & Write
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-document-accent/10 text-document-accent border border-document-accent/20">
              Read Only
            </span>
          )}
        </div>
      </div>

      {/* Bottom Section: Analytics & Action Buttons */}
      <div>
        {/* Analytics Counter Row */}
        <div className="flex items-center justify-between text-xs text-white/40 mb-3.5 pt-2.5 border-t border-white/5 font-mono">
          <div className="flex items-center gap-1.5">
            <Eye size={13} className="text-white/30" />
            <span>{link.views || 0} views</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download size={13} className="text-white/30" />
            <span>{link.downloads || 0}</span>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2">
          {/* Copy Link Button */}
          <button
            onClick={handleCopy}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border ${
              copied
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 shadow-sm"
                : "bg-accent-soft hover:bg-accent-soft/80 text-accent-primary border-accent-border"
            }`}
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600 dark:text-emerald-300" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Quick Toggle Switch Button */}
          <button
            onClick={() => onToggleActive(link._id)}
            className={`p-2 rounded-xl border transition-all duration-300 flex items-center justify-center ${
              link.isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
            title={link.isActive ? "Disable Link" : "Activate Link"}
          >
            <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors ${
              link.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full bg-white dark:bg-black transition-transform ${
                link.isActive ? "translate-x-2.5" : "translate-x-0"
              }`} />
            </div>
          </button>

          {/* External Open / Preview Button */}
          <button
            onClick={handleOpenLink}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center shrink-0"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

    </div>
  );
}
