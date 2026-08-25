import { useState, useEffect, useCallback, useRef } from "react";

export function useFileKeyboardNavigation({
  items = [],
  selectedItems = [],
  setSelectedItems,
  onNavigate,
  onPreview,
  onDelete,
  onRename,
  onStar,
  onDownload,
  onParentNavigate,
  viewMode = "grid",
  isReadOnly = false,
  containerRef,
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [anchorIndex, setAnchorIndex] = useState(-1);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Sync focused index if selectedItems changes externally
  useEffect(() => {
    if (selectedItems.length === 1 && items.length > 0) {
      const idx = items.findIndex((i) => (i._id || i.id) === (selectedItems[0]._id || selectedItems[0].id));
      if (idx !== -1 && idx !== focusedIndex) {
        setFocusedIndex(idx);
        setAnchorIndex(idx);
      }
    } else if (selectedItems.length === 0) {
      // Keep focusedIndex if already set, or default to 0
    }
  }, [selectedItems, items]);

  // Estimate grid columns based on container width
  const getGridColumns = useCallback(() => {
    if (viewMode === "list") return 1;
    if (!containerRef?.current) return 4;
    const width = containerRef.current.clientWidth;
    // Card min-width is 180px + 24px gap
    const columns = Math.max(1, Math.floor(width / 204));
    return columns;
  }, [viewMode, containerRef]);

  // Scroll item into view
  const scrollIntoView = useCallback((index) => {
    if (index < 0 || !itemsRef.current[index]) return;
    const item = itemsRef.current[index];
    const el = document.getElementById(`file-card-${item._id || item.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  // Handle Arrow Navigation with Shift Selection
  const handleArrowNavigation = useCallback(
    (direction, shiftKey) => {
      const currentItems = itemsRef.current;
      if (!currentItems || currentItems.length === 0) return;

      const columns = getGridColumns();
      let currentIndex = focusedIndex;

      if (currentIndex === -1) {
        currentIndex = 0;
      }

      let nextIndex = currentIndex;

      if (direction === "right") {
        nextIndex = Math.min(currentItems.length - 1, currentIndex + 1);
      } else if (direction === "left") {
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (direction === "down") {
        nextIndex = Math.min(currentItems.length - 1, currentIndex + columns);
      } else if (direction === "up") {
        nextIndex = Math.max(0, currentIndex - columns);
      }

      setFocusedIndex(nextIndex);
      scrollIntoView(nextIndex);

      if (shiftKey) {
        // Multi-select contiguous range
        const anchor = anchorIndex !== -1 ? anchorIndex : currentIndex;
        const start = Math.min(anchor, nextIndex);
        const end = Math.max(anchor, nextIndex);
        const range = currentItems.slice(start, end + 1);
        setSelectedItems(range);
      } else {
        // Single select focused item
        setAnchorIndex(nextIndex);
        setSelectedItems([currentItems[nextIndex]]);
      }
    },
    [focusedIndex, anchorIndex, getGridColumns, scrollIntoView, setSelectedItems]
  );

  // Listen to Global Shortcut events
  useEffect(() => {
    const onVaultShortcut = (e) => {
      const { actionId, event: keyEvent } = e.detail || {};
      const currentItems = itemsRef.current;

      switch (actionId) {
        case "nav_next":
          handleArrowNavigation("right", false);
          break;
        case "nav_prev":
          handleArrowNavigation("left", false);
          break;
        case "nav_down":
          handleArrowNavigation("down", false);
          break;
        case "nav_up":
          handleArrowNavigation("up", false);
          break;
        case "select_range_next":
          handleArrowNavigation("right", true);
          break;
        case "select_range_prev":
          handleArrowNavigation("left", true);
          break;
        case "select_range_down":
          handleArrowNavigation("down", true);
          break;
        case "select_range_up":
          handleArrowNavigation("up", true);
          break;
        case "open_item":
          if (focusedIndex >= 0 && currentItems[focusedIndex]) {
            const focusedItem = currentItems[focusedIndex];
            if (focusedItem.type === "directory" || !focusedItem.filename) {
              onNavigate?.(focusedItem);
            } else {
              onPreview?.(focusedItem);
            }
          }
          break;
        case "navigate_parent":
          onParentNavigate?.();
          break;
        case "preview_item":
          if (focusedIndex >= 0 && currentItems[focusedIndex]) {
            const focusedItem = currentItems[focusedIndex];
            if (focusedItem.type !== "directory" && focusedItem.filename) {
              onPreview?.(focusedItem);
            }
          }
          break;
        case "rename_item":
          if (!isReadOnly) {
            const itemToRename = selectedItems[0] || currentItems[focusedIndex];
            if (itemToRename) onRename?.(itemToRename);
          }
          break;
        case "delete_item":
          if (!isReadOnly && selectedItems.length > 0) {
            onDelete?.();
          }
          break;
        case "star_item":
          if (focusedIndex >= 0 && currentItems[focusedIndex]) {
            onStar?.(currentItems[focusedIndex]);
          }
          break;
        case "download_item":
          if (focusedIndex >= 0 && currentItems[focusedIndex]) {
            onDownload?.(currentItems[focusedIndex]);
          }
          break;
        case "select_all":
          if (currentItems.length > 0) {
            setSelectedItems([...currentItems]);
          }
          break;
        case "deselect_all":
          setSelectedItems([]);
          break;
        default:
          break;
      }
    };

    window.addEventListener("vault:shortcut", onVaultShortcut);
    return () => window.removeEventListener("vault:shortcut", onVaultShortcut);
  }, [
    focusedIndex,
    selectedItems,
    isReadOnly,
    handleArrowNavigation,
    onNavigate,
    onPreview,
    onParentNavigate,
    onRename,
    onDelete,
    onStar,
    onDownload,
    setSelectedItems,
  ]);

  return {
    focusedIndex,
    setFocusedIndex,
    anchorIndex,
    setAnchorIndex,
    handleArrowNavigation,
  };
}
