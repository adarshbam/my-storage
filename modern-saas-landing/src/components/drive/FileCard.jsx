import { useState, useRef, useEffect } from "react";
import { MoreVertical, Download, Edit2, Trash2 } from "lucide-react";
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
      className={`relative group bg-white dark:bg-slate-900 border rounded-xl p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
        selected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
          : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
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
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {type === "directory" ? (
            <img
              src="/folder.png"
              alt="folder"
              className="w-8 h-8 object-contain"
            />
          ) : (
            <>
              {item.hasThumbnail && !imageError ? (
                <img
                  src={`${SERVER_URL}/file/${item.id}/thumbnail`}
                  alt="thumbnail"
                  className="w-8 h-8 object-cover rounded"
                  onError={() => setImageError(true)}
                />
              ) : (
                <img
                  src={getFileImage(item.extension?.slice(1))}
                  alt="file"
                  className="w-8 h-8 object-contain"
                  onError={(e) => (e.target.src = "/file-images/file.png")}
                />
              )}
            </>
          )}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {!isTrash && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRename(item);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit2 size={14} /> Rename
                </button>
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

      <div>
        <h3
          className="text-sm font-medium text-slate-900 dark:text-white truncate mb-1"
          title={item.name}
        >
          {item.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {type === "file" && formatSize(item.size)}
          {type === "directory" &&
            `${item.files?.length + item.directories?.length || 0} items`}
        </p>
      </div>
    </div>
  );
}
