import { useEffect, useState, useRef, lazy, Suspense } from "react";
import {
  useParams,
  useNavigate,
  useOutletContext,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { SERVER_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { joinUrl } from "../../lib/utils";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import FileCard from "./FileCard";
import {
  Upload,
  FolderPlus,
  Loader2,
  Trash2,
  Edit2,
  LayoutGrid,
  List,
  Search,
  Settings,
  SlidersHorizontal,
} from "lucide-react";

// Lazy load the preview modal since it contains heavy syntax highlighter dependencies
const FilePreviewModal = lazy(() => import("./FilePreviewModal"));

export default function FileBrowser({ specialView }) {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    openUploadModal,
    uploadFile,
    downloadFile,
    setCurrentFolderId,
    refreshTrigger,
    searchQuery: inputSearchQuery,
    setSearchQuery: setInputSearchQuery,
    handleSearch,
    recentSearches,
    showRecentSearches,
    setShowRecentSearches,
    showFilters,
    setShowFilters,
  } = useOutletContext();

  const [data, setData] = useState({ directories: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [dirName, setDirName] = useState("Home");
  const [selectedItems, setSelectedItems] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  // --- DRAG SELECTION STATE ---
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const containerRef = useRef(null);

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || searchParams.get("search");
  const isSearch = location.pathname.endsWith("/search") || !!searchQuery;

  const handlePreview = (file) => {
    setPreviewFile(file);
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let url = joinUrl(SERVER_URL, "directory", folderId || "");

      if (specialView === "shared") {
        url = `${SERVER_URL}/file/shared`;
      } else if (specialView === "recent") {
        url = `${SERVER_URL}/file/recent`;
      } else if (specialView === "starred") {
        url = `${SERVER_URL}/file/starred`;
      }

      if (isSearch) {
        if (!searchQuery) {
          setLoading(false);
          setData({ directories: [], files: [] });
          setDirName("Search");
          return;
        }
        const parentId = folderId;
        url = `${SERVER_URL}/file/search?q=${encodeURIComponent(searchQuery)}${parentId ? `&parentId=${parentId}` : ""}`;
      }

      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const result = await response.json();
        setData({
          directories: result.directories || [],
          files: result.files || [],
          parentDir: result.parentDir,
        });
        setDirName(
          result.name || 
          (isSearch ? `Search: ${searchQuery}` : 
           specialView === "shared" ? "Shared with me" : 
           specialView === "recent" ? "Recent" : 
           specialView === "starred" ? "Starred" : 
           "Home"),
        );
      } else {
        console.error("Failed to fetch files");
        // Fallback title on failure
        setDirName(
           isSearch ? `Search: ${searchQuery}` : 
           specialView === "shared" ? "Shared with me" : 
           specialView === "recent" ? "Recent" : 
           specialView === "starred" ? "Starred" : 
           "Home"
        );
        setData({ directories: [], files: [] });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    setSelectedItems([]);
    setLastSelectedId(null);
    setCurrentFolderId(folderId || null);
  }, [folderId, refreshTrigger, location.pathname, searchQuery, specialView]);

  // --- HANDLERS ---

  const handleSelect = (item, e) => {
    if (e && e.shiftKey && lastSelectedId) {
      const allItems = [...data.directories, ...data.files];
      const lastIndex = allItems.findIndex((i) => i.id === lastSelectedId);
      const currentIndex = allItems.findIndex((i) => i.id === item.id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const range = allItems.slice(start, end + 1);

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

  // --- DRAG SELECTION HANDLERS ---
  const handleMouseDown = (e) => {
    // Ignore updates from right click or non-left click, or if clicking on an interactive element
    if (e.button !== 0) return;
    if (e.target.closest("button") || e.target.closest("[draggable]")) return;

    const { clientX, clientY } = e;
    const rect = e.currentTarget.getBoundingClientRect();

    // Calculate relative position within the container
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setIsDragging(true);
    setStartPoint({ x, y, clientX, clientY });
    setSelectionBox({ x, y, width: 0, height: 0 });

    // Clear selection if not holding shift/ctrl
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

      // --- INTERSECTION LOGIC ---
      const selectionRect = {
        left: Math.min(startPoint.clientX, clientX),
        top: Math.min(startPoint.clientY, clientY),
        right: Math.max(startPoint.clientX, clientX),
        bottom: Math.max(startPoint.clientY, clientY),
      };

      const items = [...data.directories, ...data.files];
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
  }, [isDragging, startPoint, data]);

  // --- MODAL STATE ---
  const [modalType, setModalType] = useState(null); // 'create' | 'rename' | null
  const [modalItem, setModalItem] = useState(null);
  const [modalInput, setModalInput] = useState("");

  const handleRenameClick = (item) => {
    setModalItem(item);
    setModalInput(item.name);
    setModalType("rename");
  };

  const handleCreateClick = () => {
    setModalInput("");
    setModalType("create");
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalInput.trim()) return;

    if (modalType === "create") {
      try {
        await fetch(`${SERVER_URL}/directory/${folderId || ""}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foldername: modalInput }),
          credentials: "include",
        });
        fetchFiles();
      } catch (err) {
        console.error("Create folder failed", err);
      }
    } else if (modalType === "rename" && modalItem) {
      if (modalInput === modalItem.name) {
        setModalType(null);
        return;
      }

      const typeEndpoint =
        modalItem.type === "directory" ||
        data.directories.find((d) => d.id === modalItem.id)
          ? "directory"
          : "file";
      const bodyKey =
        typeEndpoint === "directory" ? "newDirName" : "newFileName";

      try {
        await fetch(`${SERVER_URL}/${typeEndpoint}/${modalItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [bodyKey]: modalInput }),
          credentials: "include",
        });
        fetchFiles();
      } catch (err) {
        console.error("Rename failed", err);
      }
    }
    setModalType(null);
  };

  // --- HANDLERS ---

  const handleNavigate = (dir) => {
    navigate(`/dashboard/folder/${dir.id}`);
  };

  const handleDownload = (item) => {
    if (!item.id) return;
    const url =
      item.type === "directory"
        ? `${SERVER_URL}/directory/${item.id}?action=download`
        : `${SERVER_URL}/file/${item.id}?action=download`;

    const name = item.type === "directory" ? `${item.name}.zip` : item.name;
    downloadFile(url, name);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;

    const endpoint = item.extension ? "file" : "directory";
    const typeEndpoint = data.directories.find((d) => d.id === item.id)
      ? "directory"
      : "file";

    try {
      await fetch(`${SERVER_URL}/${typeEndpoint}/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchFiles();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // const onFileUpload = (files) => { ... } // Replaced by uploadFile from context

  // We don't need onFileUpload function anymore, we use uploadFile directly or via handleDrop

  // Actually handleDrop calls transferRef.current.uploadFile.
  // We need to update handleDrop to use `uploadFile` from context.

  // And the header upload button uses `openUploadModal`.

  // So `onFileUpload` is dead code?
  // It was used by the hidden input.
  // The hidden input is for the "Upload" button?
  // No, I replaced that with `setShowUploadModal(true)`.
  // So I can remove `onFileUpload`.

  const handleDragStart = (e, item) => {
    // If we are dragging an item that is selected, we drag all selected items
    // If we drag an item NOT selected, we only drag that item (and maybe clear selection? standard behavior depends)
    // Let's go with: if item is selected, drag all selected. If not, drag only item.

    let itemsToDrag = [item];
    if (selectedItems.some((i) => i.id === item.id)) {
      itemsToDrag = selectedItems;
    }

    // Ensure type is present for all
    const preparedItems = itemsToDrag.map((i) => ({
      ...i,
      type: i.type || (i.extension ? "file" : "directory"),
    }));

    e.dataTransfer.setData("draggedItems", JSON.stringify(preparedItems));
    // Keep 'draggedItem' for backward compatibility or single item logic if needed, but 'draggedItems' is main now
    e.dataTransfer.setData("draggedItem", JSON.stringify(preparedItems[0]));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if files are being dropped (Desktop Upload)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const targetDirId =
        targetItem &&
        targetItem.id &&
        data.directories.find((d) => d.id === targetItem.id)
          ? targetItem.id
          : folderId;

      uploadFile(files, targetDirId);
      return;
    }

    // Handle internal DnD
    const draggedItemsStr = e.dataTransfer.getData("draggedItems");
    const singleDraggedItemStr = e.dataTransfer.getData("draggedItem");

    let itemsToMove = [];
    if (draggedItemsStr) {
      itemsToMove = JSON.parse(draggedItemsStr);
    } else if (singleDraggedItemStr) {
      itemsToMove = [JSON.parse(singleDraggedItemStr)];
    }

    if (itemsToMove.length === 0) return;

    // Filter out if target is one of the moved items (can't move folder into itself)
    if (itemsToMove.some((i) => i.id === targetItem.id)) return;

    // If dropping on back button (targetItem is header back button placeholder or similar logic)
    // The caller of handleDrop passes targetItem.
    // If we drop on a folder card, targetItem is that folder.

    // We only allow dropping into directories
    // If targetItem.id is current folderId, it means no move (unless we dropped on breadcrumb? handled separately)

    // Verify target is a valid directory (or root/parent)
    // Logic: If targetItem has id, use it.

    try {
      await fetch(`${SERVER_URL}/directory/${targetItem.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemsToMove),
        credentials: "include",
      });
      fetchFiles();
      // Optionally clear selection if moved
      setSelectedItems([]);
    } catch (err) {
      console.error("Move failed", err);
    }
  };

  const handleZoneDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleZoneDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        uploadFile(files);
      }
    }
  };

  return (
    <div
      className="flex-1 flex flex-col relative"
      onDrop={handleZoneDrop}
      onDragOver={handleZoneDragOver}
    >
      <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2 pb-5 mb-5 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 shrink-0 order-1">
          {data.parentDir && (
            <button
              onClick={() => {
                if (data.parentDir === user?.rootDirectoryId) {
                  navigate("/dashboard");
                } else {
                  navigate(`/dashboard/folder/${data.parentDir}`);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (data.parentDir) {
                  handleDrop(e, { id: data.parentDir });
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-2 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Go Back (Drop items here to move to parent)"
            >
              ←
            </button>
          )}
          <h2 className="text-2xl capitalize font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {dirName}
            {folderId && !isSearch && (
              <button
                onClick={() => {
                  setModalItem({
                    id: folderId,
                    name: dirName,
                    type: "directory",
                  });
                  setModalInput(dirName);
                  setModalType("rename");
                }}
                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all"
                title="Rename Folder"
              >
                <Edit2 size={18} />
              </button>
            )}
          </h2>
        </div>

        {/* MIDDLE SECTION: Search Bar from Context */}
        <div className="relative w-full md:flex-1 md:max-w-md xl:max-w-lg flex items-center gap-2 mx-0 md:mx-4 group order-3 md:order-2">
          <div className="relative flex-1 opacity-90 hover:opacity-100 transition-opacity">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer z-10"
              size={18}
              onClick={() => handleSearch(inputSearchQuery)}
            />
            <input
              type="text"
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-[#12141D] border border-slate-200/50 dark:border-slate-800/40 text-slate-900 dark:text-white rounded-xl focus:bg-white dark:focus:bg-[#151822] focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/30 outline-none transition-all shadow-sm text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
              value={inputSearchQuery || ""}
              onChange={(e) => {
                const val = e.target.value;
                setInputSearchQuery(val);
                if (!val) {
                  handleSearch("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(inputSearchQuery);
              }}
              onFocus={() => setShowRecentSearches(true)}
              onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
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
          
          {showRecentSearches && recentSearches && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 right-20 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 overflow-hidden">
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                Recent Searches
              </div>
              {recentSearches.map((term, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  onClick={() => handleSearch(term)}
                >
                  <Search size={14} className="text-slate-400" />
                  {term}
                </div>
              ))}
            </div>
          )}
          {showFilters && (
            <div className="absolute top-full left-0 md:left-auto md:right-20 mt-2 w-72 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Filters</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Refine your search results.</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Extensions</label>
                  <input type="text" placeholder="e.g. pdf, png, docx" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-slate-900 dark:text-slate-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-1">Size</label>
                  <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-slate-900 dark:text-slate-200">
                    <option>Any Size</option>
                    <option>&lt; 1MB</option>
                    <option>1MB - 10MB</option>
                    <option>10MB - 100MB</option>
                    <option>&gt; 100MB</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Starred Only</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-500 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
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
          {!specialView ? (
            <>
              <button
                onClick={handleCreateClick}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                <FolderPlus size={18} />
                <span className="hidden sm:inline">New Folder</span>
              </button>
              <button
                onClick={openUploadModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/20"
              >
                <Upload size={18} />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </>
          ) : null}
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

          {data.directories.map((dir) => (
            <FileCard
              id={`file-card-${dir.id}`}
              key={dir.id}
              item={dir}
              type="directory"
              selected={selectedItems.some((i) => i.id === dir.id)}
              onSelect={(item, e) => handleSelect(item, e)}
              onNavigate={handleNavigate}
              onRename={handleRenameClick}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onPreview={handlePreview}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              viewMode={viewMode}
            />
          ))}
          {data.files.map((file) => (
            <FileCard
              id={`file-card-${file.id}`}
              key={file.id}
              item={file}
              type="file"
              selected={selectedItems.some((i) => i.id === file.id)}
              onSelect={(item, e) => handleSelect(item, e)}
              onNavigate={() => {}} // Files don't navigate
              onRename={handleRenameClick}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onPreview={handlePreview}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              viewMode={viewMode}
            />
          ))}

          {data.directories.length === 0 && data.files.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              {specialView ? (
                <p className="text-lg font-medium mb-2">
                  {isSearch ? "No search results found" : "No files yet"}
                </p>
              ) : (
                <>
                  <div
                    className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-full mb-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    onClick={openUploadModal}
                  >
                    <Upload size={40} />
                  </div>
                  <p className="text-lg font-medium mb-2">
                    {isSearch ? "No search results found" : "This folder is empty"}
                  </p>
                  <p className="text-sm">
                    {isSearch
                      ? "Try adjusting your search query"
                      : "Drag and drop files here or use the upload button"}
                  </p>
                </>
              )}
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
            onClick={async () => {
              if (!confirm(`Delete ${selectedItems.length} items?`)) return;
              const deletePromises = selectedItems.map((item) => {
                const endpoint = item.extension ? "file" : "directory";
                const isDir = Boolean(
                  item.files || item.directories || !item.extension,
                );
                const finalTypeEndpoint =
                  item.type === "directory" || isDir ? "directory" : "file";
                return fetch(`${SERVER_URL}/${finalTypeEndpoint}/${item.id}`, {
                  method: "DELETE",
                  credentials: "include",
                });
              });
              await Promise.all(deletePromises);
              fetchFiles();
              setSelectedItems([]);
            }}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors font-medium text-sm"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      )}

      <Modal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        title={modalType === "create" ? "Create New Folder" : "Rename Item"}
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter name..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalType(null)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {modalType === "create" ? "Create Folder" : "Rename"}
            </Button>
          </div>
        </form>
      </Modal>

      <Suspense fallback={null}>
        {!!previewFile && (
          <FilePreviewModal
            file={previewFile}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </Suspense>
    </div>
  );
}
