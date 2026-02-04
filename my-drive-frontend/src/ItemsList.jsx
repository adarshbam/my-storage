import { Link, useNavigate } from "react-router-dom";
import getFileImage from "./FileImages";

const ItemsList = ({
  items,
  type, // "directory" | "file"
  serverUrl,
  selectedItems = [],
  onToggleSelection = () => {},
  onRename,
  onDelete,
  onDownload,
  onRestore,
}) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const handleDoubleClick = (item) => {
    if (type === "directory") {
      navigate(`/directory/${item.id}?action=open`);
    } else {
      // For files, open in new tab/download
      window.location.href = `${serverUrl}/file/${item.id}?action=open`;
    }
  };

  const handleClick = (e, item) => {
    e.preventDefault(); // Prevent default link behavior if we wrap in Link/a
    onToggleSelection(item);
  };

  return (
    <ul>
      {items.map((item) => {
        const isSelected = selectedItems.some((i) => i.id === item.id);
        return (
          <li
            key={item.id}
            className={isSelected ? "active" : ""}
            onClick={(e) => handleClick(e, item)}
            onDoubleClick={() => handleDoubleClick(item)}
            style={{ listStyle: "none", cursor: "pointer" }}
          >
            {/* ITEM CONTENT */}
            <div
              title={type === "directory" ? "Open Directory" : "Open File"}
              style={{ display: "flex", alignItems: "center", flex: 1 }}
            >
              <img
                src={
                  type === "directory"
                    ? "/folder.png"
                    : getFileImage(item.extension?.slice(1))
                }
                alt={item.name}
                style={{
                  width: "1.875rem",
                  verticalAlign: "middle",
                  marginRight: type === "directory" ? ".625rem" : ".3125rem",
                }}
              />
              {item.name}
            </div>

            {/* ACTION BUTTONS */}
            <div
              style={{
                display: "inline-flex",
                gap: ".3125rem",
                marginLeft: "auto",
                verticalAlign: "middle",
              }}
              onClick={(e) => e.stopPropagation()} // Prevent selection when clicking actions
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {/* DOWNLOAD */}
              {onDownload && (
                <button
                  onClick={() => onDownload(item)}
                  title={`Download ${type === "directory" ? "Directory" : "File"}`}
                  style={{ width: "2.5rem" }}
                >
                  <img
                    src="/features/download.png"
                    alt="Download"
                    style={{ width: "100%" }}
                  />
                </button>
              )}

              {/* RENAME */}
              {onRename && (
                <button
                  onClick={() => onRename(item)}
                  title={`Rename ${type === "directory" ? "Directory" : "File"}`}
                >
                  <img
                    src="/features/edit.png"
                    alt="Rename"
                    style={{ width: "100%" }}
                  />
                </button>
              )}

              {/* RESTORE (Trash) */}
              {onRestore && (
                <button
                  onClick={() => onRestore(item)}
                  title={`Restore ${type === "directory" ? "Directory" : "File"}`}
                >
                  <img
                    src="/features/restore.png"
                    alt="Restore"
                    style={{ width: "100%" }}
                  />
                </button>
              )}

              {/* DELETE */}
              {onDelete && (
                <button
                  onClick={() => onDelete(item)}
                  title={`Delete ${type === "directory" ? "Directory" : "File"}`}
                >
                  <img
                    src="/features/delete.png"
                    alt="Delete"
                    style={{ width: "100%" }}
                  />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ItemsList;
