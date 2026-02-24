import { useEffect, useState, useRef } from "react";
import { SERVER_URL } from "../../lib/api";
import { Loader2, Trash2, RotateCcw, Ban } from "lucide-react";
import FileCard from "./FileCard";
import Button from "../ui/Button";

export default function TrashView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);

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
      <div className="flex items-center justify-between mb-6 text-slate-800 dark:text-white">
        <div className="flex items-center gap-2">
          <Trash2 size={24} />
          <h2 className="text-2xl font-bold">Trash</h2>
        </div>

        {items.length > 0 && (
          <Button variant="danger" onClick={handleEmptyTrash}>
            Empty Trash
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <div
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20 relative select-none flex-1 content-start"
          onMouseDown={handleMouseDown}
        >
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

          {items.map((item) => (
            <FileCard
              id={`file-card-${item.id}`}
              key={item.id}
              item={item}
              type={item.type || (item.extension ? "file" : "directory")}
              isTrash={true}
              selected={selectedItems.some((i) => i.id === item.id)}
              onSelect={(item, e) => handleSelect(item, e)}
              onNavigate={() => {}}
              // Map buttons for trash context
              onDownload={() => handleRestore([item])} // Restore
              onDelete={() => handleDeleteForever([item])} // Delete Forever
            />
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400">
              <p>Trash is empty</p>
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
