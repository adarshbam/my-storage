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
import FileBrowserSkeleton from "./FileBrowserSkeleton";

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
        const rawItems = Array.isArray(data)
          ? data
          : [...(data?.files || []), ...(data?.directories || [])];
        setItems(rawItems);
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

  const safeItems = Array.isArray(items) ? items : [];

  // Filter items by search, extension, and size
  const filteredItems = safeItems.filter((item) => {
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
    if (!itemsToRestore || itemsToRestore.length === 0) return;
    try {
      if (itemsToRestore.length === 1) {
        const item = itemsToRestore[0];
        const isDirectory =
          item.type === "directory" || (!item.extension && item.files);
        const endpoint = isDirectory
          ? `${SERVER_URL}/trash/directory/${item._id}/restore`
          : `${SERVER_URL}/trash/${item._id}/restore`;
        await fetch(endpoint, { method: "POST", credentials: "include" });
      } else {
        await fetch(`${SERVER_URL}/trash/restore-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: itemsToRestore.map((i) => ({
              id: i._id,
              _id: i._id,
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
      console.error("Restore failed", err);
    }
  };

  const handleRestoreAll = async () => {
    if (items.length === 0) return;
    try {
      await fetch(`${SERVER_URL}/trash/restore-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
        credentials: "include",
      });
      fetchTrash();
      setSelectedItems([]);
    } catch (err) {
      console.error("Restore all failed", err);
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
              _id: i._id,
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
    <div className="flex-1 min-w-0 w-full flex flex-col relative h-full">
      <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 pb-4 mb-4 border-b border-white/5 shrink-0 px-1 sm:px-2">
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="text-lg min-[360px]:text-xl sm:text-2xl capitalize font-bold text-white flex items-center gap-2 drop-shadow-md tracking-wide">
            Recycle Vault
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

          {safeItems.length > 0 && (
            <>
              <button
                onClick={selectedItems.length > 0 ? () => handleRestore(selectedItems) : handleRestoreAll}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 min-[360px]:px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] min-[360px]:text-xs sm:text-sm font-semibold rounded-xl bg-vault-emerald/10 border border-vault-emerald/30 text-vault-emerald hover:bg-vault-emerald/20 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,212,165,0.3)] shrink-0"
              >
                <RotateCcw size={15} />
                <span className="hidden sm:inline">
                  {selectedItems.length > 0 ? `Restore (${selectedItems.length})` : "Restore All"}
                </span>
              </button>
              <button
                onClick={selectedItems.length > 0 ? () => handleDeleteForever(selectedItems) : handleEmptyTrash}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 min-[360px]:px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] min-[360px]:text-xs sm:text-sm font-semibold rounded-xl bg-danger-accent/10 border border-danger-accent/30 text-danger-accent hover:bg-danger-accent/20 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,90,122,0.3)] shrink-0"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">
                  {selectedItems.length > 0 ? `Delete (${selectedItems.length})` : "Empty Trash"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <FileBrowserSkeleton viewMode={viewMode} count={8} />
      ) : (
        <div
          className={`pb-20 relative select-none flex-1 content-start min-w-0 w-full ${
            viewMode === "list"
              ? "flex flex-col gap-2 p-1 sm:p-2"
              : "grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] min-[360px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] vault-glass-panel"
          }`}
          onMouseDown={handleMouseDown}
        >
          {viewMode === "list" && (
            <div className="grid grid-cols-[1fr,40px] sm:grid-cols-[1fr,100px,40px] md:grid-cols-[1fr,100px,150px,40px] gap-2 sm:gap-4 px-2 min-[360px]:px-3 sm:px-4 py-2 sm:py-3 text-[11px] min-[360px]:text-xs sm:text-sm font-semibold text-slate-500 border-b border-slate-200/50 dark:border-slate-800/50 mb-2 items-center sticky top-0 bg-transparent z-10 min-w-0 w-full">
              <div>Name</div>
              <div className="text-right hidden sm:block">Size</div>
              <div className="text-right pr-4 hidden md:block">Modified</div>
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
            <div className="col-span-full flex flex-col items-center justify-center py-12 sm:py-20 px-3 min-[360px]:px-4 text-center max-w-full">
              <div className="bg-white/40 dark:bg-white/[0.03] p-4 min-[360px]:p-5 sm:p-6 rounded-full mb-3 sm:mb-4 shadow-[0_0_30px_rgba(255,90,122,0.05)] dark:shadow-[0_0_30px_rgba(255,90,122,0.1)] text-danger-accent/60">
                <Trash2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <p className="text-base min-[360px]:text-lg font-bold mb-1.5 text-white">
                {searchQuery
                  ? "No search results in trash"
                  : "Trash is completely clear"}
              </p>
              <p className="text-xs min-[360px]:text-sm text-slate-500 max-w-xs sm:max-w-sm text-center leading-relaxed">
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar bg-white/90 dark:bg-vault-surface/90 backdrop-blur-2xl text-slate-900 dark:text-white px-3 min-[360px]:px-4 sm:px-6 py-2 min-[360px]:py-2.5 sm:py-3 rounded-full shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/[0.08] flex items-center gap-2 min-[360px]:gap-3 sm:gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 text-xs min-[360px]:text-sm">
          <span className="font-medium whitespace-nowrap">
            {selectedItems.length} selected
          </span>
          <div className="h-4 w-px bg-slate-700 shrink-0"></div>

          <button
            onClick={() => handleRestore(selectedItems)}
            className="flex items-center gap-1.5 text-slate-200 hover:text-white transition-colors font-medium whitespace-nowrap"
          >
            <RotateCcw size={15} /> Restore
          </button>

          <button
            onClick={() => handleDeleteForever(selectedItems)}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors font-medium whitespace-nowrap"
          >
            <Ban size={15} /> Delete Forever
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
