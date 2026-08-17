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

function getItemVisual(item, items = []) {
  if (!item && (!items || items.length === 0)) {
    return {
      Icon: Layers,
      bg: "bg-relay-accent/10",
      text: "text-relay-accent",
      border: "border-relay-accent/25",
    };
  }

  if (items && items.length > 1) {
    return {
      Icon: Layers,
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
      border: "border-indigo-500/25",
    };
  }

  const singleItem = item || (items && items[0]);
  if (!singleItem) {
    return {
      Icon: Layers,
      bg: "bg-relay-accent/10",
      text: "text-relay-accent",
      border: "border-relay-accent/25",
    };
  }

  if (singleItem.type === "directory") {
    return {
      Icon: Folder,
      bg: "bg-accent-soft",
      text: "text-accent-primary",
      border: "border-accent-border",
    };
  }

  const ext = (singleItem.extension || singleItem.name?.split(".").pop() || "").toLowerCase();
  
  if (["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "avif"].some(e => ext.includes(e))) {
    return {
      Icon: ImageIcon,
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/25",
    };
  }
  if (["mp4", "mkv", "mov", "webm", "avi"].some(e => ext.includes(e))) {
    return {
      Icon: Film,
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/25",
    };
  }
  if (["mp3", "wav", "ogg", "flac", "m4a", "aac"].some(e => ext.includes(e))) {
    return {
      Icon: Music,
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/25",
    };
  }
  if (["zip", "rar", "7z", "tar", "gz"].some(e => ext.includes(e))) {
    return {
      Icon: Archive,
      bg: "bg-pink-500/10",
      text: "text-pink-400",
      border: "border-pink-500/25",
    };
  }
  if (["js", "jsx", "ts", "tsx", "py", "html", "css", "json", "c", "cpp", "java", "sql"].some(e => ext.includes(e))) {
    return {
      Icon: Code2,
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/25",
    };
  }

  return {
    Icon: FileText,
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/25",
  };
}

export default function SharedLinkRow({
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
    <div className={`group px-4 py-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 ${
      isActive
        ? "bg-white dark:bg-vault-surface/70 hover:bg-slate-50 dark:hover:bg-vault-surface border-slate-200 dark:border-white/5 hover:border-accent-border shadow-sm hover:shadow-md"
        : "bg-slate-50 dark:bg-vault-surface/30 border-slate-200 dark:border-white/5 opacity-60 hover:opacity-100"
    } vault-card-interactive text-slate-900 dark:text-white`}>
      {/* Left: Icon & Title & Meta */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${visual.bg} ${visual.text} ${visual.border}`}>
          <VisualIcon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white truncate" title={displayName}>
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 font-medium mt-0.5">
            <span>{formattedSize}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Middle: Badges */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        {isExpired ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Clock size={10} /> Expired
          </span>
        ) : link.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Globe size={10} /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/10">
            <Ban size={10} /> Disabled
          </span>
        )}

        {link.accessType === "public" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
            Public
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            Restricted
          </span>
        )}

        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
          permissionType === "owner"
            ? "bg-danger-accent/10 text-danger-accent border border-danger-accent/20"
            : permissionType === "write"
            ? "bg-media-accent/10 text-media-accent border border-media-accent/20"
            : "bg-document-accent/10 text-document-accent border border-document-accent/20"
        }`}>
          {permissionType === "owner" ? "Admin" : permissionType === "write" ? "Write" : "Read"}
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCopy}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border ${
            copied
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40"
              : "bg-accent-soft hover:bg-accent-soft/80 text-accent-primary border-accent-border"
          }`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        <button
          onClick={() => onToggleActive(link._id)}
          className={`p-1.5 rounded-xl border transition-all ${
            link.isActive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
              : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/10"
          }`}
          title={link.isActive ? "Disable Link" : "Activate Link"}
        >
          <div className={`w-5 h-3 rounded-full p-0.5 transition-colors ${
            link.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"
          }`}>
            <div className={`w-2 h-2 rounded-full bg-white dark:bg-black transition-transform ${
              link.isActive ? "translate-x-2" : "translate-x-0"
            }`} />
          </div>
        </button>

        <button
          onClick={handleOpenLink}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors"
          title="Open in new tab"
        >
          <ExternalLink size={13} />
        </button>

        {/* 3-dots Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <MoreVertical size={15} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-7 z-30 w-44 bg-white dark:bg-vault-panel/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-0.5 animate-fade-in text-slate-900 dark:text-white">
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
    </div>
  );
}
