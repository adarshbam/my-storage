import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  ExternalLink,
  Unlink,
} from "lucide-react";
import getFileImage from "../../lib/FileImages";
import { formatSize } from "../../lib/utils";
import { SERVER_URL } from "../../lib/api";

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
  onDragStart,
  onDragOver,
  onDrop,
  isTrash = false,
  viewMode = "grid",
  isIntegrationRoot = false,
  ...props
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
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

  return (
    <div
      className={`relative group bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border rounded-xl transition-all duration-300 cursor-pointer hover:shadow-[0_0_20px_rgba(20,184,166,0.08)] dark:hover:shadow-[0_0_25px_rgba(20,184,166,0.12)] ${
        showMenu ? "z-[100]" : "z-0"
      } ${
        viewMode === "list"
          ? "grid grid-cols-[1fr,100px,150px,40px] items-center p-2 pr-2 gap-4 hover:bg-white/80 dark:hover:bg-white/[0.06] border-transparent hover:border-black/10 dark:hover:border-white/10"
          : "flex flex-col px-5 py-3 gap-1.5 border-black/5 dark:border-white/[0.06] hover:border-[#14b8a6]/30 dark:hover:border-[#14b8a6]/30 hover:scale-[1.02]"
      } ${
        selected && viewMode !== "list"
          ? "border-[#14b8a6]/60 ring-2 ring-[#14b8a6]/30 shadow-[0_0_20px_rgba(20,184,166,0.15)]"
          : selected && viewMode === "list"
            ? "bg-white/80 dark:bg-white/[0.06] border-[#14b8a6]/30 dark:border-[#14b8a6]/20"
            : ""
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item, e);
      }}
      onDoubleClick={handleDoubleClick}
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragOver={(e) => onDragOver(e, item)}
      onDrop={(e) => onDrop(e, item)}
      {...props}
    >
      {/* Thumbnail Area */}
      <div
        className={
          viewMode === "list"
            ? "flex flex-row items-center min-w-0"
            : "relative w-full aspect-square bg-white/30 dark:bg-white/[0.03] flex items-center justify-center overflow-hidden rounded-lg"
        }
      >
        {type === "directory" ? (
          <>
            {isIntegrationRoot && item.provider === "google_drive" ? (
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg"
                alt="Google Drive"
                className={`${viewMode === "list" ? "w-8 h-8 mr-4 ml-1 shrink-0" : "w-14 h-14"} drop-shadow-sm group-hover:scale-105 transition-transform duration-300`}
              />
            ) : isIntegrationRoot && item.provider === "github" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 98 96"
                className={`${viewMode === "list" ? "w-8 h-8 mr-4 ml-1 shrink-0" : "w-14 h-14"} drop-shadow-sm group-hover:scale-105 transition-transform duration-300 text-slate-800 dark:text-white`}
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.868 0 48.854 0z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <img
                src="/folder.png"
                alt="folder"
                className={`${viewMode === "list" ? "w-10 h-10 mr-3 shrink-0" : "w-14 h-14"} object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300`}
              />
            )}
            {viewMode === "list" && (
              <h3
                className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate w-full"
                title={item.name}
              >
                {item.name}
              </h3>
            )}
          </>
        ) : (
          <>
            {viewMode === "grid" && item.hasThumbnail && !imageError ? (
              <img
                src={`${SERVER_URL}/file/${item.id}/thumbnail`}
                alt="thumbnail"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
                crossOrigin="use-credentials"
              />
            ) : viewMode === "grid" ? (
              <div className="flex flex-col items-center justify-center p-4 w-full h-full">
                <img
                  src={getFileImage(item.extension?.slice(1))}
                  alt="file"
                  className="w-16 h-16 mb-2 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => (e.target.src = "/file-images/file.png")}
                />
              </div>
            ) : (
              <>
                <img
                  src={getFileImage(item.extension?.slice(1))}
                  alt="file"
                  className="w-10 h-10 mr-3 shrink-0 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => (e.target.src = "/file-images/file.png")}
                />
                <h3
                  className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate w-full"
                  title={item.name}
                >
                  {item.name}
                </h3>
              </>
            )}
          </>
        )}
      </div>

      {/* Info Area */}
      {viewMode === "grid" ? (
        <div className="px-1 pb-1 flex-1 flex flex-col items-center justify-center w-full min-w-0">
          <h3
            style={{ textTransform: "capitalize" }}
            className="text-sm capitalize mt-2 font-medium text-slate-900 dark:text-white truncate w-full text-center mb-0.5"
            title={item.name}
          >
            {item.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 w-full truncate text-center min-h-[16px]">
            {type === "directory" && (item.provider === "google_drive" || item.provider === "github") ? null : (
              <>
                {formatSize(item.size)}
                {` `}
                {type === "directory" &&
                  `${item.itemCount !== undefined ? item.itemCount : (item.files?.length || 0) + (item.directories?.length || 0)} items`}
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-400 text-right truncate">
            {type === "directory" && (item.provider === "google_drive" || item.provider === "github") ? null : type === "directory"
              ? `${item.itemCount !== undefined ? item.itemCount : (item.files?.length || 0) + (item.directories?.length || 0)} items`
              : formatSize(item.size)}
          </div>
          <div className="text-xs text-slate-400 text-right pr-4 truncate">
            {type === "directory" && (item.provider === "google_drive" || item.provider === "github") ? null : "few minutes ago"}
          </div>
        </>
      )}

      {/* Options Menu Overlay */}
      <div
        className={
          viewMode === "grid"
            ? "absolute top-2 right-2 z-10"
            : "relative flex items-center justify-end"
        }
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`p-1.5 rounded-lg backdrop-blur-sm transition-opacity focus:opacity-100 ${
            viewMode === "list"
              ? "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 opacity-100"
              : "opacity-0 group-hover:opacity-100 bg-black/40 text-white hover:bg-black/60"
          }`}
        >
          <MoreVertical size={16} />
        </button>

        {showMenu && (
          <div
            ref={menuRef}
            className={`absolute right-0 ${
              viewMode === "list" ? "top-8" : "top-full mt-1"
            } w-[140px] bg-white dark:bg-[#1a1a1c] border border-black/10 dark:border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)] z-[60] py-1`}
            onClick={(e) => e.stopPropagation()}
          >
            {!isTrash && (
              <>
                <button
                  onClick={(e) => {
                    setShowMenu(false);
                    handleDoubleClick(e);
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <ExternalLink size={14} /> Open
                </button>
                {item.provider !== "github" && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onRename(item);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
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
                className="w-full text-left px-3 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
              >
                <Unlink size={14} /> Unlink
              </button>
            )}

            {!isTrash &&
              type === "directory" &&
              item.provider === "github" &&
              item.githubPath?.split("/").length === 2 && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDownload(item);
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Download size={14} /> Download Repo
                </button>
              )}

            {/* Standard actions for everything else (not integration root, not repo root) */}
            {!isIntegrationRoot &&
              !(
                type === "directory" &&
                item.provider === "github" &&
                item.githubPath?.split("/").length === 2
              ) && (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDownload(item);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    {isTrash ? (
                      <Download className="rotate-180" size={14} />
                    ) : (
                      <Download size={14} />
                    )}
                    {isTrash ? "Restore" : "Download"}
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(item);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> {isTrash ? "Delete Forever" : "Delete"}
                  </button>
                </>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
