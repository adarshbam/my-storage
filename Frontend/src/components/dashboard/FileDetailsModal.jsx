import { X, Calendar, HardDrive, Shield, FileType, User } from "lucide-react";
import { formatSize, formatDate, isSpecialFolder } from "../../lib/utils";
import {
  VaultDriveIcon,
  VaultGitIcon,
  EncryptionBadgeIcon,
} from "../ui/VaultIcons";
import { SERVER_URL } from "../../lib/api";
import getFileImage, { renderFileIcon } from "../../lib/FileImages";
import { useThumbnailUrl } from "../../lib/thumbnailCache";

export default function FileDetailsModal({ item, onClose }) {
  const { thumbnailUrl, error: thumbCdnError } = useThumbnailUrl(item);

  if (!item) return null;

  const isDirectory =
    item.type === "directory" || item.provider === "shared_drive";
  const provider = item.provider || "local";
  const ext = item.name.split(".").pop()?.toLowerCase() || "";
  const isSpecial = isSpecialFolder(item);

  // Environment styling
  let envClass =
    "text-accent-primary bg-accent-soft border-accent-border";
  if (item.isTrash)
    envClass = "text-danger-accent bg-danger-accent/10 border-danger-accent/30";
  else if (provider === "google_drive" || provider === "shared_drive" || item.name?.toLowerCase() === "google drive")
    envClass =
      "text-pulse-accent bg-pulse-accent/10 border-pulse-accent/30";
  else if (provider === "github" || item.name?.toLowerCase() === "github")
    envClass =
      "text-linkgit-accent bg-linkgit-accent/10 border-linkgit-accent/30";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
          <h2 className="text-xs font-bold tracking-widest text-slate-700 dark:text-white/70 uppercase">
            Asset Details
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hero Section */}
        <div className="p-8 flex flex-col items-center border-b border-slate-100 dark:border-white/5 relative overflow-hidden">
          <div
            className={`absolute inset-0 opacity-10 bg-gradient-radial to-transparent from-slate-400 dark:from-white`}
          />

          <div
            className={`rounded-lg ${item.type === "file" && item.hasThumbnail ? "bg-slate-100 dark:bg-vault-black border-4 border-slate-200 dark:border-white shadow-xl" : ""} flex overflow-hidden items-center justify-center shrink-0 mb-4 relative z-10`}
          >
            {isDirectory ? (
              provider === "google_drive" || item.name?.toLowerCase() === "google drive" ? (
                <VaultDriveIcon
                  size={40}
                  className="drop-shadow-[0_0_15px_rgba(77,166,255,0.4)]"
                />
              ) : provider === "github" || item.name?.toLowerCase() === "github" ? (
                <VaultGitIcon
                  size={40}
                  className="text-white drop-shadow-[0_0_15px_rgba(198,92,255,0.4)]"
                />
              ) : (
                <div className="text-accent-primary drop-shadow-[0_0_15px_var(--accent-glow)]">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
              )
            ) : item.hasThumbnail && !thumbCdnError && thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="thumbnail"
                className="w-full h-full object-cover drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]"
                draggable={false}
              />
            ) : (
              renderFileIcon(ext, { size: 48, className: "drop-shadow-lg" })
            )}
          </div>

          <h3 className="text-xl font-semibold text-slate-900 dark:text-white text-center break-all z-10">
            {item.name}
          </h3>
        </div>

        {/* Metadata List */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
              <FileType size={14} className="text-slate-500 dark:text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30 tracking-wider">
                Type
              </p>
              <p className="text-sm text-slate-700 dark:text-white/80 font-medium">
                {isSpecial
                  ? "Special Chamber"
                  : isDirectory
                    ? "Directory (Chamber)"
                    : `File (${ext.toUpperCase() || "Unknown"})`}
              </p>
            </div>
          </div>

          {!isSpecial && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <HardDrive size={14} className="text-slate-500 dark:text-white/50" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30 tracking-wider">
                  Size
                </p>
                <p className="text-sm text-slate-700 dark:text-white/80 font-medium">
                  {formatSize(item.size) || 0}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
              <HardDrive size={14} className="text-slate-500 dark:text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30 tracking-wider">
                Path
              </p>
              <div className="text-sm text-slate-700 dark:text-white/80 flex flex-wrap items-center gap-1 font-medium mt-0.5">
                {/* Root Segment */}
                <span className="text-slate-500 dark:text-white/40 font-normal">
                  {provider === "google_drive" || item.name?.toLowerCase() === "google drive"
                    ? "Google Drive"
                    : provider === "github" || item.name?.toLowerCase() === "github"
                      ? "GitHub"
                      : provider === "shared_drive"
                        ? "Secure Relay"
                        : "Vault Chamber"}
                </span>

                {/* Separator if path or item name exists */}
                <span className="text-slate-300 dark:text-white/20 select-none">/</span>

                {/* Path Segments */}
                {Array.isArray(item.path) && item.path.length > 0 ? (
                  item.path.map(({ name }, index) => {
                    const isLast = index === item.path.length - 1;
                    return (
                      <span key={index} className="flex items-center gap-1">
                        <span
                          className={
                            isLast
                              ? "text-slate-900 dark:text-white font-semibold"
                              : "text-slate-600 dark:text-white/50 font-normal"
                          }
                        >
                          {name}
                        </span>
                        {!isLast && (
                          <span className="text-slate-300 dark:text-white/20 select-none">/</span>
                        )}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-slate-900 dark:text-white font-semibold">{item.name}</span>
                )}
              </div>
            </div>
          </div>

          {isDirectory && !isSpecial ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <HardDrive size={14} className="text-slate-500 dark:text-white/50" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30 tracking-wider">
                  Contents
                </p>
                <p className="text-sm text-slate-700 dark:text-white/80 font-medium">
                  {`${item?.filesCount || 0} files   ${item?.directoriesCount || 0} directories`}
                </p>
              </div>
            </div>
          ) : (
            ""
          )}

          {item.createdAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <Calendar size={14} className="text-slate-500 dark:text-white/50" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30 tracking-wider">
                  Date Created
                </p>
                <p className="text-sm text-slate-700 dark:text-white/80 font-medium">
                  {formatDate(item.createdAt)}
                </p>
              </div>
            </div>
          )}

          {item.updatedAt && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <Calendar size={14} className="text-slate-500 dark:text-white/50" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30 tracking-wider">
                  Date Modified
                </p>
                <p className="text-sm text-slate-700 dark:text-white/80 font-medium">
                  {formatDate(item.updatedAt)}
                </p>
              </div>
            </div>
          )}

          {item.ownerEmail && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-black/40 flex items-center justify-center border border-slate-200 dark:border-white/5">
                <User size={14} className="text-slate-500 dark:text-white/50" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30 tracking-wider">
                  Owner
                </p>
                <p className="text-sm text-slate-700 dark:text-white/80 font-medium">{item.ownerEmail}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.isTrash ? "bg-danger-accent/10 border-danger-accent/20" : "bg-accent-soft border-accent-border"}`}
            >
              <Shield
                size={14}
                className={
                  item.isTrash ? "text-danger-accent" : "text-accent-primary"
                }
              />
            </div>
            <div className="flex-1">
              <p
                className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-white/40"
              >
                {item.isTrash ? "Status" : "Security"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {item.isTrash ? (
                  <span className="text-sm font-mono text-danger-accent">
                    Marked for Deletion (Expired)
                  </span>
                ) : (
                  <>
                    <EncryptionBadgeIcon
                      size={12}
                      className="text-accent-primary"
                    />
                    <span className="text-sm font-mono text-accent-primary">
                      AES-256 Encrypted
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
