import { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  ExternalLink,
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
      className={`relative group bg-[rgb(15,15,15)] border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md ${
        viewMode === "list"
          ? "grid grid-cols-[1fr,100px,150px,40px] items-center p-2 pr-2 gap-4 hover:bg-[rgb(20,20,20)] bg-transparent border-transparent hover:border-slate-800"
          : "flex flex-col px-5 py-3 gap-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
      } ${
        selected && viewMode !== "list"
          ? "border-blue-500 ring-2 ring-blue-500"
          : selected && viewMode === "list"
            ? "bg-[rgb(20,20,20)] border-slate-700"
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
            : "relative w-full aspect-square bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden rounded-lg"
        }
      >
        {type === "directory" ? (
          <>
            <img
              src="/folder.png"
              alt="folder"
              className={`${viewMode === "list" ? "w-10 h-10 mr-3 shrink-0" : "w-14 h-14"} object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300`}
            />
            {viewMode === "list" && (
              <h3
                className="text-sm font-medium text-slate-200 truncate w-full"
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
                  className="text-sm font-medium text-slate-200 truncate w-full"
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
          <p className="text-xs text-slate-500 dark:text-slate-400 w-full truncate text-center">
            {formatSize(item.size)}
            {` `}
            {type === "directory" &&
              `${item.itemCount !== undefined ? item.itemCount : (item.files?.length || 0) + (item.directories?.length || 0)} items`}
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-400 text-right truncate">
            {type === "directory"
              ? `${item.itemCount !== undefined ? item.itemCount : (item.files?.length || 0) + (item.directories?.length || 0)} items`
              : formatSize(item.size)}
          </div>
          <div className="text-xs text-slate-400 text-right pr-4 truncate">
            few minutes ago
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
              ? "text-slate-500 hover:bg-slate-800 opacity-100"
              : "opacity-0 group-hover:opacity-100 bg-black/40 text-white hover:bg-black/60"
          }`}
        >
          <MoreVertical size={16} />
        </button>

        {showMenu && (
          <div
            ref={menuRef}
            className={`absolute right-0 ${viewMode === "list" ? "top-8" : "top-full mt-1"} w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-[60] py-1`}
            onClick={(e) => e.stopPropagation()}
          >
            {!isTrash && (
              <>
                <button
                  onClick={(e) => {
                    setShowMenu(false);
                    handleDoubleClick(e);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <ExternalLink size={14} /> Open
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRename(item);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit2 size={14} /> Rename
                </button>
              </>
            )}

            <button
              onClick={() => {
                setShowMenu(false);
                onDownload(item);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
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
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
            >
              <Trash2 size={14} /> {isTrash ? "Delete Forever" : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
