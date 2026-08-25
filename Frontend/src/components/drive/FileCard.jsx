import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  ExternalLink,
  Unlink,
  Info,
} from "lucide-react";
import { formatSize } from "../../lib/utils";
import { SERVER_URL } from "../../lib/api";
import { prefetchFileContent } from "../../lib/fileCache";
import { useThumbnailUrl } from "../../lib/thumbnailCache";
import {
  VectorFolderIcon,
  VectorCodeIcon,
  VectorDocIcon,
  VectorImageIcon,
  VectorVideoIcon,
  VectorAudioIcon,
  VectorArchiveIcon,
  VectorFileIcon,
} from "../ui/VaultIcons";
import { getFileCategory } from "../../lib/FileImages";

export default function FileCard({
  item,
  type, // "directory" | "file"
  selected,
  onSelect,
  onNavigate,
  onRename,
  onDelete,
  onDownload,
  onPreview,
  onDetails,
  onDragStart,
  onDragOver,
  onDrop,
  isTrash = false,
  viewMode = "grid",
  isIntegrationRoot = false,
  readOnly = false,
  ...props
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { thumbnailUrl, error: thumbCdnError } = useThumbnailUrl(item);
  const [thumbSrc, setThumbSrc] = useState(thumbnailUrl);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setThumbSrc(thumbnailUrl);
    setTriedFallback(false);
    setImageError(false);
  }, [thumbnailUrl]);

  const handleImageError = () => {
    if (!triedFallback && item?._id && item.provider !== "google_drive" && item.provider !== "github") {
      setTriedFallback(true);
      setThumbSrc(`${SERVER_URL}/file/${item._id}/thumbnail`);
    } else {
      setImageError(true);
    }
  };

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (type === "directory") {
      onNavigate(item);
    } else {
      if (onPreview) {
        onPreview(item);
      } else {
        onDownload(item);
      }
    }
  };

  const ext = item?.extension?.toLowerCase() || "";
  const category = getFileCategory(ext);

  const renderFileVectorIcon = (size = 28) => {
    if (category === "code") return <VectorCodeIcon size={size} className="text-cyan-500" />;
    if (category === "image") return <VectorImageIcon size={size} className="text-purple-500" />;
    if (category === "video") return <VectorVideoIcon size={size} className="text-rose-500" />;
    if (category === "audio") return <VectorAudioIcon size={size} className="text-amber-500" />;
    if (category === "archive") return <VectorArchiveIcon size={size} className="text-orange-500" />;
    if (category === "document") return <VectorDocIcon size={size} className="text-blue-500" />;
    return <VectorFileIcon size={size} ext={ext} className="text-slate-400" />;
  };

  const getIconBackground = () => {
    if (type === "directory") return "bg-accent-soft text-accent-primary";
    if (category === "code") return "bg-cyan-500/10 text-cyan-500";
    if (category === "image") return "bg-purple-500/10 text-purple-500";
    if (category === "video") return "bg-rose-500/10 text-rose-500";
    if (category === "audio") return "bg-amber-500/10 text-amber-500";
    if (category === "archive") return "bg-orange-500/10 text-orange-500";
    if (category === "document") return "bg-blue-500/10 text-blue-500";
    return "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400";
  };

  return (
    <div
      className={`relative group transition-all duration-200 cursor-pointer select-none ${
        showMenu ? "z-40" : "z-0"
      } ${
        viewMode === "list"
          ? "vault-card-interactive grid grid-cols-[1fr,110px,140px,40px] items-center p-3 px-4 gap-4 bg-white dark:bg-vault-surface/80 hover:bg-slate-50/90 dark:hover:bg-vault-surface border border-slate-200/90 dark:border-white/10 hover:border-accent-border/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
          : "vault-card-interactive flex flex-col p-4 rounded-2xl bg-white dark:bg-vault-surface/80 border border-slate-200/90 dark:border-white/10 hover:border-accent-border/60 shadow-sm hover:shadow-xl dark:hover:shadow-black/50 transition-all duration-200 backdrop-blur-xl"
      } ${
        selected
          ? "ring-2 ring-accent-primary bg-accent-soft/30 dark:bg-accent-soft/20 border-accent-border shadow-md"
          : ""
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item, e);
      }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => {
        if (type !== "directory" && item) prefetchFileContent(item);
      }}
      draggable={!readOnly}
      onDragStart={readOnly ? undefined : (e) => onDragStart(e, item)}
      onDragOver={readOnly ? undefined : (e) => onDragOver(e, item)}
      onDrop={readOnly ? undefined : (e) => onDrop(e, item)}
      {...props}
    >
      {/* Visual Thumbnail Area */}
      <div
        className={
          viewMode === "list"
            ? "flex items-center min-w-0"
            : "relative w-full aspect-square bg-slate-50 dark:bg-black/30 rounded-xl overflow-hidden flex items-center justify-center mb-3 border border-slate-100 dark:border-white/5"
        }
      >
        {type === "directory" ? (
          <>
            {isIntegrationRoot && item.provider === "google_drive" ? (
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg"
                alt="Google Drive"
                className={`${viewMode === "list" ? "w-6 h-6 mr-3 shrink-0" : "w-12 h-12"} object-contain`}
                loading="lazy"
              />
            ) : isIntegrationRoot && item.provider === "github" ? (
              <div className={`${viewMode === "list" ? "mr-3 shrink-0" : ""} text-slate-800 dark:text-white`}>
                <svg viewBox="0 0 98 96" className={viewMode === "list" ? "w-6 h-6" : "w-12 h-12"} fill="currentColor">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.868 0 48.854 0z"
                  />
                </svg>
              </div>
            ) : (
              <div className={`${viewMode === "list" ? "p-1.5 rounded-lg mr-3 shrink-0" : "p-3 rounded-2xl"} ${getIconBackground()}`}>
                <VectorFolderIcon size={viewMode === "list" ? 18 : 32} />
              </div>
            )}
            {viewMode === "list" && (
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {item.name}
              </span>
            )}
          </>
        ) : (
          <>
            {viewMode === "grid" && item.hasThumbnail && !imageError && thumbSrc ? (
              <img
                src={thumbSrc}
                alt="thumbnail"
                className="w-full h-full object-cover rounded-xl"
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div className={`${viewMode === "list" ? "p-1.5 rounded-lg mr-3 shrink-0" : "p-3.5 rounded-2xl"} ${getIconBackground()}`}>
                {renderFileVectorIcon(viewMode === "list" ? 18 : 32)}
              </div>
            )}
            {viewMode === "list" && (
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {item.name}
              </span>
            )}
          </>
        )}
      </div>

      {/* Info Area */}
      {viewMode === "grid" ? (
        <div className="flex flex-col w-full min-w-0">
          <h3
            className="text-xs font-bold text-slate-900 dark:text-white truncate mb-1"
            title={item.name}
          >
            {item.name}
          </h3>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {type === "directory" && (item.provider === "google_drive" || item.provider === "github")
                ? "Linked Relay"
                : type === "directory"
                  ? `${(item.itemCount ?? item.items ?? (item.filesCount || 0) + (item.directoriesCount || 0))} items`
                  : formatSize(item.size)}
            </span>
            <span className="text-[10px] font-mono opacity-70 uppercase">
              {type === "directory" ? "DIR" : ext.replace(".", "") || "FILE"}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-500 dark:text-slate-400 text-right truncate font-mono">
            {type === "directory" && (item.provider === "google_drive" || item.provider === "github")
              ? "Relay"
              : type === "directory"
                ? `${(item.itemCount ?? item.items ?? (item.filesCount || 0) + (item.directoriesCount || 0))} items`
                : formatSize(item.size)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 text-right truncate">
            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Active"}
          </div>
        </>
      )}

      {/* Options Menu Button & Popover */}
      <div
        className={
          viewMode === "grid"
            ? "absolute top-2 right-2 z-20"
            : "relative flex items-center justify-end"
        }
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <MoreVertical size={16} />
        </button>

        {showMenu && (
          <div
            ref={menuRef}
            className={`absolute right-0 ${
              viewMode === "list" ? "top-8" : "top-full mt-1"
            } w-36 bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden text-xs font-semibold`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowMenu(false);
                onDetails(item, type);
              }}
              className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2"
            >
              <Info size={14} /> Details
            </button>
            {!isTrash && (
              <>
                <button
                  onClick={(e) => {
                    setShowMenu(false);
                    handleDoubleClick(e);
                  }}
                  className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <ExternalLink size={14} /> Open
                </button>
                {item.provider !== "github" && !readOnly && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onRename(item);
                    }}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <Edit2 size={14} /> Rename
                  </button>
                )}
              </>
            )}

            {!isTrash && isIntegrationRoot && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(item);
                }}
                className="w-full text-left px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2"
              >
                <Unlink size={14} /> Unlink
              </button>
            )}

            {!isIntegrationRoot && (
              <>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDownload(item);
                  }}
                  className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2"
                >
                  <Download size={14} /> {isTrash ? "Restore" : "Download"}
                </button>

                {!readOnly && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(item);
                    }}
                    className="w-full text-left px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> {isTrash ? "Delete Forever" : "Delete"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
