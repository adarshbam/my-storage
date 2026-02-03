import { Link } from "react-router-dom";
import getFileImage from "./FileImages";

const ItemsList = ({
  items,
  type, // "directory" | "file"
  serverUrl,
  onRename,
  onDelete,
  onDownload,
  onRestore,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <ul>
      {items.map((item) => {
        return (
          <li key={item.id} style={{ listStyle: "none" }}>
            {/* OPEN / NAVIGATE */}
            {type === "directory" ? (
              <Link
                to={`/directory/${item.id}?action=open`}
                title="Open Directory"
                style={{ display: "flex", alignItems: "center" }}
              >
                <img
                  src={"/folder.png"}
                  alt={item.name}
                  style={{
                    width: "1.875rem",
                    verticalAlign: "middle",
                    marginRight: ".625rem",
                  }}
                />
                {item.name}
              </Link>
            ) : (
              <a
                href={`${serverUrl}/file/${item.id}?action=open`}
                title="Open File"
                style={{ display: "flex", alignItems: "center" }}
              >
                <img
                  src={getFileImage(item.extension.slice(1))}
                  alt={item.name}
                  style={{
                    width: "1.875rem",
                    verticalAlign: "middle",
                    marginRight: ".3125rem",
                  }}
                />
                {item.name}
              </a>
            )}

            {/* ACTION BUTTONS */}
            <div
              style={{
                display: "inline-flex",
                gap: ".3125rem",
                marginLeft: "auto",
                verticalAlign: "middle",
              }}
            >
              {/* DOWNLOAD */}
              {onDownload && (
                <button
                  onClick={() => onDownload(item)}
                  title={`Download ${type === "directory" ? "Directory" : "File"}`}
                  style={{ width: "2.5rem" }}
                >
                  {type === "directory" ? (
                    <img src="/features/download.png" alt="Download" />
                  ) : (
                    // For files, we can use a direct download link if onDownload isn't custom logic,
                    // but the original used a simpler valid anchor inside a button?
                    // Original FilesList: <a href... download> inside <button>
                    // Let's preserve the original behavior for file download if it was just a link,
                    // OR standardise on a handler.
                    // The original FilesList had:
                    // <a href={`${serverUrl}/file/${item.id}?action=download`} download>...</a>
                    // to maintain exact behavior for files without a handler:

                    <img
                      src="/features/download.png"
                      alt="Download"
                      style={{ width: "100%" }}
                    />
                  )}
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
