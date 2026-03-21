import { useEffect, useState, useRef } from "react";
import { SERVER_URL } from "../../lib/api";
import { Loader2, Trash2, RotateCcw, Ban, Search, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import FileCard from "./FileCard";
import Button from "../ui/Button";

export default function TrashView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  
  // Header state
  const [inputSearchQuery, setInputSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("viewMode") || "grid");

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

  // Filter items by search
  const filteredItems = items.filter(item => 
    item.name?.toLowerCase().includes(inputSearchQuery.toLowerCase())
  );

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
        const element = document.getElementById(`file-card-${item.id}`);
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
      const lastIndex = items.findIndex((i) => i.id === lastSelectedId);
      const currentIndex = items.findIndex((i) => i.id === item.id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = items.slice(start, end + 1);

        setSelectedItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = range.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
        setLastSelectedId(item.id);
      }
    } else {
      setLastSelectedId(item.id);
      setSelectedItems((prev) =>
        prev.some((i) => i.id === item.id)
          ? prev.filter((i) => i.id !== item.id)
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
        ? `${SERVER_URL}/trash/directory/${item.id}/restore`
        : `${SERVER_URL}/trash/${item.id}/restore`;
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
          ? `${SERVER_URL}/trash/directory/${item.id}`
          : `${SERVER_URL}/trash/${item.id}`;
        await fetch(endpoint, { method: "DELETE", credentials: "include" });
      } else {
        await fetch(`${SERVER_URL}/trash/delete-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: itemsToDelete.map((i) => ({
              id: i.id,
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
      <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2 pb-5 mb-5 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 shrink-0 order-1">
          <h2 className="text-2xl capitalize font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Trash
          </h2>
        </div>

        <div className="relative w-full md:flex-1 md:max-w-md xl:max-w-lg flex items-center gap-2 mx-0 md:mx-4 group order-3 md:order-2">
          <div className="relative flex-1 opacity-90 hover:opacity-100 transition-opacity">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer z-10"
              size={18}
            />
            <input
              type="text"
              placeholder="Search trash..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-[#12141D] border border-slate-200/50 dark:border-slate-800/40 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-[#151822] focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/30 outline-none transition-all shadow-sm text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
              value={inputSearchQuery}
              onChange={(e) => setInputSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-all ${
              showFilters 
                ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" 
                : "bg-slate-100/50 dark:bg-[#12141D] border-slate-200/50 dark:border-slate-800/40 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shadow-sm"
            }`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 order-2 md:order-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2 hidden md:flex">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
          
          {items.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-lg hover:bg-red-600/20 dark:hover:bg-red-500/20 transition-colors font-medium shadow-sm"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">Empty Trash</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <div
          className={`pb-20 relative select-none flex-1 content-start ${
            viewMode === "list"
              ? "flex flex-col gap-1"
              : "grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-4"
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

          {filteredItems.map((item) => (
            <FileCard
              id={`file-card-${item.id}`}
              key={item.id}
              item={item}
              type={item.type || (item.extension ? "file" : "directory")}
              isTrash={true}
              viewMode={viewMode}
              selected={selectedItems.some((i) => i.id === item.id)}
              onSelect={(item, e) => handleSelect(item, e)}
              onNavigate={() => {}}
              // Map buttons for trash context
              onDownload={() => handleRestore([item])} // Restore
              onDelete={() => handleDeleteForever([item])} // Delete Forever
            />
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400">
              <p>Trash is empty or no files match search</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
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
    </div>
  );
}
