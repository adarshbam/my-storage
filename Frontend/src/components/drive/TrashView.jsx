import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SERVER_URL } from "../../lib/api";
import {
  Loader2,
  Trash2,
  RotateCcw,
  Ban,
  LayoutGrid,
  List,
} from "lucide-react";
import AssetCard from "../dashboard/AssetCard";
import FileDetailsModal from "../dashboard/FileDetailsModal";

export default function TrashView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);

  // Header state
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("viewMode") || "grid",
  );

  // --- DRAG SELECTION STATE ---
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [startPoint, setStartPoint] = useState(null);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/trash`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
    setSelectedItems([]);
    setLastSelectedId(null);
  }, []);

  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  const searchQuery = searchParams.get("q") || "";
  const searchExt = searchParams.get("ext") || "";
  const searchSize = searchParams.get("size") || "";

  // Filter items by search, extension, and size
  const filteredItems = items.filter((item) => {
    // 1. Search term filter
    if (
      searchQuery &&
      !item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // 2. Extension filter
    if (searchExt) {
      const itemExt = (item.extension || item.name?.split(".").pop() || "")
        .replace(/^\./, "")
        .toLowerCase();
      if (itemExt !== searchExt.toLowerCase()) {
        return false;
      }
    }

    // 3. Max Size filter
    if (searchSize) {
      const maxSizeBytes = parseInt(searchSize) * 1024 * 1024;
      if (item.size && item.size > maxSizeBytes) {
        return false;
      }
    }

    return true;
  });

  // --- DRAG SELECTION HANDLERS ---
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("[draggable]")) return;

    const { clientX, clientY } = e;
    const rect = e.currentTarget.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setIsDragging(true);
    setStartPoint({ x, y, clientX, clientY });
    setSelectionBox({ x, y, width: 0, height: 0 });

    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedItems([]);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;

      const diffX = clientX - startPoint.clientX;
      const diffY = clientY - startPoint.clientY;

      const newBox = {
        x: diffX > 0 ? startPoint.x : startPoint.x + diffX,
        y: diffY > 0 ? startPoint.y : startPoint.y + diffY,
        width: Math.abs(diffX),
        height: Math.abs(diffY),
      };

      setSelectionBox(newBox);

      const selectionRect = {
        left: Math.min(startPoint.clientX, clientX),
        top: Math.min(startPoint.clientY, clientY),
        right: Math.max(startPoint.clientX, clientX),
        bottom: Math.max(startPoint.clientY, clientY),
      };

      const newSelected = items.filter((item) => {
        const element = document.getElementById(`file-card-${item._id}`);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.left < selectionRect.right &&
          rect.right > selectionRect.left &&
          rect.top < selectionRect.bottom &&
          rect.bottom > selectionRect.top
        );
      });

      setSelectedItems(newSelected);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setSelectionBox(null);
      setStartPoint(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, startPoint, items]);

  const handleSelect = (item, e) => {
    if (e && e.shiftKey && lastSelectedId) {
      const lastIndex = items.findIndex((i) => i._id === lastSelectedId);
      const currentIndex = items.findIndex((i) => i._id === item._id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = items.slice(start, end + 1);

        setSelectedItems((prev) => {
          const existingIds = new Set(prev.map((i) => i._id));
          const newItems = range.filter((i) => !existingIds.has(i._id));
          return [...prev, ...newItems];
        });
        setLastSelectedId(item._id);
      }
    } else {
      setLastSelectedId(item._id);
      setSelectedItems((prev) =>
        prev.some((i) => i._id === item._id)
          ? prev.filter((i) => i._id !== item._id)
          : [...prev, item],
      );
    }
  };

  // --- ACTIONS ---

  const handleEmptyTrash = async () => {
    if (
      !confirm(
        "Are you sure you want to permanently delete all items in the trash?",
      )
    )
      return;
    try {
      await fetch(`${SERVER_URL}/trash`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchTrash();
      setSelectedItems([]);
    } catch (err) {
      console.error("Empty trash failed", err);
    }
  };

  const handleRestore = async (itemsToRestore) => {
    const promises = itemsToRestore.map((item) => {
      const isDirectory =
        item.type === "directory" || (!item.extension && item.files);
      const endpoint = isDirectory
        ? `${SERVER_URL}/trash/directory/${item._id}/restore`
        : `${SERVER_URL}/trash/${item._id}/restore`;
      return fetch(endpoint, { method: "POST", credentials: "include" });
    });

    try {
      await Promise.all(promises);
      fetchTrash();
      setSelectedItems([]);
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  const handleDeleteForever = async (itemsToDelete) => {
    if (
      !confirm(
        `Permanently delete ${itemsToDelete.length} items? This cannot be undone.`,
      )
    )
      return;

    try {
      if (itemsToDelete.length === 1) {
        const item = itemsToDelete[0];
        const isDirectory =
          item.type === "directory" || (!item.extension && item.files);
        const endpoint = isDirectory
          ? `${SERVER_URL}/trash/directory/${item._id}`
          : `${SERVER_URL}/trash/${item._id}`;
        await fetch(endpoint, { method: "DELETE", credentials: "include" });
      } else {
        await fetch(`${SERVER_URL}/trash/delete-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: itemsToDelete.map((i) => ({
              id: i._id,
              type:
                i.type ||
                (i.extension || i.files === undefined ? "file" : "directory"),
            })),
          }),
          credentials: "include",
        });
      }

      fetchTrash();
      setSelectedItems([]);
    } catch (err) {
      console.error("Delete forever failed", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative h-full">
      <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2 pb-5 mb-5 border-b border-white/5 shrink-0 px-2">
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="text-2xl capitalize font-bold text-white flex items-center gap-2 drop-shadow-md tracking-wide">
            Recycle Vault
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-black/40 backdrop-blur-sm rounded-xl p-1 border border-white/5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white/10 shadow-sm text-vault-emerald"
                  : "text-white/40 hover:text-white/80"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white/10 shadow-sm text-vault-emerald"
                  : "text-white/40 hover:text-white/80"
              }`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-danger-accent/10 border border-danger-accent/30 text-danger-accent hover:bg-danger-accent/20 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,90,122,0.3)] shrink-0"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">Empty Trash</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <div
          className={`pb-20 relative select-none flex-1 content-start ${
            viewMode === "list"
              ? "flex flex-col gap-1"
              : "grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 p-6 rounded-[2.5rem] vault-glass-panel"
          }`}
          onMouseDown={handleMouseDown}
        >
          {viewMode === "list" && (
            <div className="grid grid-cols-[1fr,100px,150px,40px] gap-4 px-4 py-3 text-sm font-semibold text-slate-500 border-b border-slate-200/50 dark:border-slate-800/50 mb-2 items-center sticky top-0 bg-transparent z-10">
              <div>Name</div>
              <div className="text-right">Size</div>
              <div className="text-right pr-4">Modified</div>
              <div></div>
            </div>
          )}

          {/* Selection Box Overlay */}
          {isDragging && selectionBox && (
            <div
              className="absolute bg-blue-500/20 border border-blue-500/50 z-50 pointer-events-none rounded-sm"
              style={{
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.width,
                height: selectionBox.height,
              }}
            />
          )}

          {filteredItems.map((item) => {
            const type = item.type || (item.extension ? "file" : "directory");
            const normalizedItem = { ...item, type };
            return (
              <AssetCard
                id={`file-card-${item._id}`}
                key={item._id}
                item={normalizedItem}
                isTrash={true}
                viewMode={viewMode}
                selected={selectedItems.some((i) => i._id === item._id)}
                onSelect={(item, e) => handleSelect(item, e)}
                onNavigate={() => {}}
                onRestore={() => handleRestore([item])}
                onDeleteForever={() => handleDeleteForever([item])}
                onDetails={(item) => setDetailsItem(item)}
              />
            );
          })}
          {filteredItems.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="bg-white/40 dark:bg-white/[0.03] p-6 rounded-full mb-4 shadow-[0_0_30px_rgba(255,90,122,0.05)] dark:shadow-[0_0_30px_rgba(255,90,122,0.1)] text-danger-accent/60">
                <Trash2 size={40} />
              </div>
              <p className="text-lg font-medium mb-2">
                {searchQuery
                  ? "No search results in trash"
                  : "Trash is completely clear"}
              </p>
              <p className="text-sm text-white/40 max-w-sm text-center">
                {searchQuery
                  ? "Try adjusting your search query parameters."
                  : "Any files or folders you delete will remain here until they are purged or expire."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-white/[0.06] backdrop-blur-2xl text-slate-900 dark:text-white px-6 py-3 rounded-full shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/[0.08] flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="font-medium text-sm">
            {selectedItems.length} selected
          </span>
          <div className="h-4 w-px bg-slate-700"></div>

          <button
            onClick={() => handleRestore(selectedItems)}
            className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors font-medium text-sm"
          >
            <RotateCcw size={16} /> Restore
          </button>

          <button
            onClick={() => handleDeleteForever(selectedItems)}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors font-medium text-sm"
          >
            <Ban size={16} /> Delete Forever
          </button>
        </div>
      )}

      {/* New Vault OS Details Modal */}
      {detailsItem && (
        <FileDetailsModal
          item={detailsItem}
          onClose={() => setDetailsItem(null)}
          isTrash={true}
        />
      )}
    </div>
  );
}
