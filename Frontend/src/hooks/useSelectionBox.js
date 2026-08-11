import { useState, useRef, useEffect } from 'react';

export function useSelectionBox(containerRef) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("[draggable]")) return;

    const { clientX, clientY } = e;
    const rect = e.currentTarget.getBoundingClientRect();

    setStartPoint({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    setSelectionBox({
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: 0,
      height: 0,
    });
    setIsDragging(true);

    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      setSelectedItems([]);
      setLastSelectedId(null);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !startPoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);

    setSelectionBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setSelectionBox(null);
    setStartPoint(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [isDragging]);

  const handleSelect = (item, e, data) => {
    if (e && e.shiftKey && lastSelectedId) {
      const allItems = [...(data?.directories || []), ...(data?.files || [])];
      const lastIndex = allItems.findIndex((i) => i._id === lastSelectedId);
      const currentIndex = allItems.findIndex((i) => i._id === item._id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = allItems.slice(start, end + 1);

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

  return {
    isDragging,
    selectionBox,
    startPoint,
    selectedItems,
    setSelectedItems,
    lastSelectedId,
    setLastSelectedId,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleSelect
  };
}
