import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams, useOutletContext, Link } from "react-router-dom";
import { SERVER_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { usePlan } from "../../context/PlanContext";
import { useGoogleLogin } from "@react-oauth/google";
import { useChamberTransfer } from "../../context/ChamberTransferContext";
import { cn, formatSize } from "../../lib/utils";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import AssetCard from "../dashboard/AssetCard";
import FileDetailsModal from "../dashboard/FileDetailsModal";
import FileBrowserSkeleton from "../drive/FileBrowserSkeleton";
import EmptyState from "../drive/EmptyState";
import { VaultDriveIcon } from "../ui/VaultIcons";
import {
  Upload,
  FolderPlus,
  Loader2,
  Trash2,
  Edit2,
  LayoutGrid,
  List,
  Search,
  ChevronRight,
  AlertTriangle,
  Unlink,
  RefreshCw,
  Folder,
  Copy,
  Scissors,
  Download,
  Eye,
  ExternalLink,
  X,
  ClipboardPaste,
} from "lucide-react";
import { toggleStar } from "../../api/files.api";

// Lazy-load Preview Modal
const FilePreviewModal = lazy(() => import("../drive/FilePreviewModal"));

export default function GoogleDriveChamber() {
  const { driveFolderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || searchParams.get("search") || "";
  const { user, setUser } = useAuth();
  const { hasFeature } = usePlan();
  const outletContext = useOutletContext() || {};
  const { downloadFile } = outletContext;

  const {
    activeDragSource,
    setActiveDragSource,
    clipboard,
    clearClipboard,
    copyItems,
    cutItems,
    transferVaultToDrive,
    isTransferring,
  } = useChamberTransfer();

  const [data, setData] = useState({ directories: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dirName, setDirName] = useState("Google Drive");
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'create-folder', 'rename', 'delete'
  const [modalItem, setModalItem] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [reconnectingDrive, setReconnectingDrive] = useState(false);

  // Upload file ref
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Drag over state for folders
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const fetchDriveContents = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      let url = "";
      if (searchQuery) {
        url = `${SERVER_URL}/drive/search?q=${encodeURIComponent(searchQuery)}`;
      } else if (driveFolderId) {
        url = `${SERVER_URL}/drive/folder/${driveFolderId}`;
      } else {
        url = `${SERVER_URL}/drive/files`;
      }

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to load Google Drive files");
      }

      const resData = await res.json();
      const directories = resData.directories || [];
      const files = resData.files || [];

      setData({ directories, files });
      setDirName(resData.name || (driveFolderId ? "Folder" : "Google Drive"));

      // Build breadcrumbs
      if (!driveFolderId) {
        setBreadcrumbs([{ name: "Google Drive", id: null }]);
      } else {
        // Cache path in session storage
        try {
          const cached = JSON.parse(sessionStorage.getItem("gdrive_paths") || "{}");
          if (resData.name) {
            cached[driveFolderId] = { name: resData.name, parentId: resData.parentId || null };
          }
          directories.forEach((d) => {
            cached[d._id] = { name: d.name, parentId: driveFolderId };
          });
          sessionStorage.setItem("gdrive_paths", JSON.stringify(cached));

          // Unwind path
          const trail = [];
          let cur = driveFolderId;
          let guard = 0;
          while (cur && guard++ < 20) {
            const entry = cached[cur];
            if (entry) {
              trail.unshift({ name: entry.name, id: cur });
              cur = entry.parentId;
            } else {
              break;
            }
          }
          setBreadcrumbs([{ name: "Google Drive", id: null }, ...trail]);
        } catch {
          setBreadcrumbs([
            { name: "Google Drive", id: null },
            { name: resData.name || "Folder", id: driveFolderId },
          ]);
        }
      }
    } catch (err) {
      console.error("Error fetching Google Drive contents:", err);
      setError(err.message || "Failed to connect to Google Drive");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriveContents();
    setSelectedItems([]);
  }, [driveFolderId, searchQuery]);

  // Listen for global refresh
  useEffect(() => {
    const handleRefresh = () => fetchDriveContents(true);
    window.addEventListener("vault:refresh", handleRefresh);
    return () => window.removeEventListener("vault:refresh", handleRefresh);
  }, [driveFolderId, searchQuery]);

  // Reconnect Google Drive if token expires
  const reconnectGoogleDrive = useGoogleLogin({
    flow: "auth-code",
    prompt: "consent",
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/drive",
    onSuccess: async (codeResponse) => {
      try {
        setReconnectingDrive(true);
        const res = await fetch(`${SERVER_URL}/drive/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code }),
          credentials: "include",
        });
        if (res.ok) {
          setError(null);
          fetchDriveContents();
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "Failed to reconnect Google Drive");
        }
      } catch (err) {
        console.error("Drive reconnect error:", err);
        setError("Failed to reconnect Google Drive");
      } finally {
        setReconnectingDrive(false);
      }
    },
    onError: (err) => {
      console.error("Google Drive connection error:", err);
      setReconnectingDrive(false);
    },
  });

  const disconnectDrive = async () => {
    if (!window.confirm("Are you sure you want to disconnect Google Drive?")) return;
    try {
      const res = await fetch(`${SERVER_URL}/drive/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        if (user) {
          const newUser = { ...user };
          if (newUser.integrations?.googleDrive) {
            newUser.integrations.googleDrive.connected = false;
            setUser(newUser);
          }
        }
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Drive disconnect error:", err);
      alert("Failed to disconnect Google Drive");
    }
  };

  // Upload file directly to Drive
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (driveFolderId) {
          formData.append("folderId", driveFolderId);
        }

        const res = await fetch(`${SERVER_URL}/drive/upload`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to upload ${file.name}`);
        }
      }
      fetchDriveContents(true);
    } catch (err) {
      console.error("Drive upload error:", err);
      alert(err.message || "Failed to upload file to Google Drive");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!modalInput.trim()) return;
    setIsSubmittingModal(true);
    try {
      const res = await fetch(`${SERVER_URL}/drive/folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modalInput.trim(),
          parentId: driveFolderId || "root",
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create folder");
      }
      setModalType(null);
      setModalInput("");
      fetchDriveContents(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Rename item
  const handleRename = async () => {
    if (!modalItem || !modalInput.trim()) return;
    setIsSubmittingModal(true);
    try {
      const res = await fetch(`${SERVER_URL}/drive/file/${modalItem._id}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modalInput.trim() }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to rename item");
      }
      setModalType(null);
      setModalItem(null);
      setModalInput("");
      fetchDriveContents(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Delete item(s)
  const handleDelete = async () => {
    const itemsToDelete = modalItem ? [modalItem] : selectedItems;
    if (!itemsToDelete || itemsToDelete.length === 0) return;
    setIsSubmittingModal(true);
    try {
      for (const itm of itemsToDelete) {
        const res = await fetch(`${SERVER_URL}/drive/file/${itm._id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to delete ${itm.name} from Drive`);
        }
      }
      setModalType(null);
      setModalItem(null);
      setSelectedItems([]);
      fetchDriveContents(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Preview file modal trigger
  const handlePreview = (file) => {
    setPreviewFile(file);
  };

  // Open directory
  const handleNavigate = (dir) => {
    navigate(`/dashboard/google-drive/${dir._id}`);
  };

  // Paste handler for Google Drive chamber
  const handlePaste = async () => {
    if (!clipboard || !clipboard.items || clipboard.items.length === 0) return;

    const sourceProviders = new Set(clipboard.items.map((i) => i.provider || "local"));
    const destDriveId = driveFolderId || "root";

    if (sourceProviders.has("google_drive")) {
      // Move within Drive
      try {
        await fetch(`${SERVER_URL}/drive/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: clipboard.items.map((i) => i._id),
            targetId: destDriveId,
          }),
          credentials: "include",
        });
        if (clipboard.action === "cut") {
          clearClipboard();
        }
        fetchDriveContents(true);
      } catch (err) {
        console.error("Failed to move within Drive", err);
      }
    } else {
      // Transfer from Vault to Drive
      await transferVaultToDrive(clipboard.items, destDriveId);
      if (clipboard.action === "cut") {
        clearClipboard();
      }
    }
  };

  // Selection handler (Shift-click range, Ctrl/Cmd-click toggle, regular click single-select)
  const handleSelect = (item, e) => {
    if (e && e.shiftKey && lastSelectedId) {
      const all = [...data.directories, ...data.files];
      const lastIdx = all.findIndex((i) => i._id === lastSelectedId);
      const currIdx = all.findIndex((i) => i._id === item._id);
      if (lastIdx !== -1 && currIdx !== -1) {
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        const range = all.slice(start, end + 1);
        setSelectedItems((prev) => {
          const set = new Set(prev.map((i) => i._id));
          const added = range.filter((i) => !set.has(i._id));
          return [...prev, ...added];
        });
        setLastSelectedId(item._id);
        return;
      }
    }

    if (e && (e.ctrlKey || e.metaKey)) {
      setLastSelectedId(item._id);
      setSelectedItems((prev) =>
        prev.some((i) => i._id === item._id)
          ? prev.filter((i) => i._id !== item._id)
          : [...prev, item]
      );
    } else {
      setLastSelectedId(item._id);
      setSelectedItems([item]);
    }
  };

  // Clear selection on background click
  const handleBackgroundClick = (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest("[draggable]") ||
      e.target.closest("input") ||
      e.target.closest("[data-asset-card]") ||
      e.target.closest("a")
    ) {
      return;
    }
    setSelectedItems([]);
  };

  // Keyboard navigation & actions for Drive chamber
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedItems([]);
        clearClipboard();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedItems.length > 0 && !modalType) {
          e.preventDefault();
          copyItems(selectedItems, "google_drive");
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
        if (selectedItems.length > 0 && !modalType) {
          e.preventDefault();
          cutItems(selectedItems, "google_drive");
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboard && clipboard.items?.length > 0) {
          e.preventDefault();
          handlePaste();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItems, modalType, clearClipboard, copyItems, cutItems, clipboard, driveFolderId]);

  // Download handler
  const handleDownload = (item) => {
    if (!item?._id) return;
    const isFolder = item.type === "directory";
    const url = isFolder
      ? `${SERVER_URL}/drive/folder/${item._id}/download`
      : `${SERVER_URL}/drive/file/${item._id}?action=download`;
    const name = isFolder ? `${item.name}.zip` : item.name;

    if (downloadFile) {
      downloadFile(url, name);
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Background drop handler: drops directly into current Google Drive folder
  const handleContainerDrop = (e) => {
    e.preventDefault();
    setDragOverFolderId(null);

    // If OS files dropped from desktop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
      return;
    }

    let items = activeDragSource?.items;
    if (!items || items.length === 0) {
      try {
        const raw = e.dataTransfer.getData("draggedItems");
        if (raw) items = JSON.parse(raw);
      } catch {}
    }
    if (!items || items.length === 0) return;

    const isLocal = items.some((i) => !i.provider || i.provider === "local");
    if (isLocal) {
      transferVaultToDrive(items, driveFolderId || "root");
    }
  };

  // Toggle Star
  const handleToggleStar = async (item) => {
    try {
      const isFolder = item.type === "directory";
      const res = await toggleStar(item._id, {
        itemId: item._id,
        type: isFolder ? "directory" : "file",
        provider: "google_drive",
        name: item.name,
        size: item.size || 0,
        mimeType: item.mimeType || "",
        metaUrl: item.webViewLink || item.metaUrl || "",
      });

      setData((prev) => {
        const isStarred = res.starred;
        const updateItem = (i) =>
          i._id === item._id ? { ...i, isStarred, starred: isStarred } : i;
        return {
          directories: prev.directories.map(updateItem),
          files: prev.files.map(updateItem),
        };
      });
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  // Drag handlers: when dragging Google Drive items
  const handleDragStart = (e, item) => {
    let itemsToDrag = [item];
    if (selectedItems.some((i) => i._id === item._id)) {
      itemsToDrag = selectedItems;
    }
    const prepared = itemsToDrag.map((i) => ({
      ...i,
      provider: "google_drive",
      type: i.type || (i.mimeType === "application/vnd.google-apps.folder" ? "directory" : "file"),
    }));

    setActiveDragSource({ items: prepared, provider: "google_drive" });
    window.__activeVaultDrag = { items: prepared, provider: "google_drive" };
    try {
      e.dataTransfer.setData("draggedItems", JSON.stringify(prepared));
      e.dataTransfer.setData("draggedItem", JSON.stringify(prepared[0]));
      e.dataTransfer.setData("vault/provider-drive", "true");
      e.dataTransfer.setData("text/plain", JSON.stringify(prepared));
    } catch {}
    e.dataTransfer.effectAllowed = "all";
  };

  const handleDragEnd = () => {
    setActiveDragSource(null);
    setDragOverFolderId(null);
    window.__activeVaultDrag = null;
  };

  // Dropping onto an internal Drive folder
  const handleFolderDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    let items = activeDragSource?.items;
    if (!items || items.length === 0) {
      try {
        const raw = e.dataTransfer.getData("draggedItems");
        if (raw) items = JSON.parse(raw);
      } catch {}
    }
    if (!items || items.length === 0) return;

    // Check source provider
    const isDrive = items.every((i) => i.provider === "google_drive");
    const isLocal = items.some((i) => !i.provider || i.provider === "local");

    if (isDrive) {
      // Move within Drive
      try {
        await fetch(`${SERVER_URL}/drive/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => i._id),
            targetId: targetFolder._id,
          }),
          credentials: "include",
        });
        fetchDriveContents(true);
      } catch (err) {
        console.error("Failed to move within Drive", err);
      }
    } else if (isLocal) {
      // Transfer from Vault to this specific folder
      transferVaultToDrive(items, targetFolder._id);
    }
  };

  const allItems = [...data.directories, ...data.files];

  return (
    <div className="flex-1 flex flex-col h-full min-w-0" onClick={handleBackgroundClick}>
      {/* ── CHAMBER HEADER TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/5">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-linkdrive-accent/10 border border-linkdrive-accent/20 text-linkdrive-accent font-bold text-sm">
            <VaultDriveIcon size={18} />
            <span>Google Drive</span>
          </div>

          {breadcrumbs.slice(1).map((b, idx) => (
            <div key={b.id || idx} className="flex items-center gap-1 text-sm font-medium">
              <ChevronRight size={14} className="text-slate-400" />
              <Link
                to={`/dashboard/google-drive/${b.id}`}
                className="text-slate-600 dark:text-white/70 hover:text-linkdrive-accent transition-colors truncate max-w-[150px]"
              >
                {b.name}
              </Link>
            </div>
          ))}

          {searchQuery && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-xs font-mono text-slate-300">
              <Search size={12} />
              <span>"{searchQuery}"</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />

          {clipboard && clipboard.items?.length > 0 && (
            <Button
              onClick={handlePaste}
              disabled={isTransferring}
              variant="outline"
              className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold border-linkdrive-accent/40 bg-linkdrive-accent/10 hover:bg-linkdrive-accent/20 text-linkdrive-accent shadow-sm"
              title="Paste items into current Google Drive folder (Ctrl+V)"
            >
              <ClipboardPaste size={15} />
              <span>Paste ({clipboard.items.length})</span>
            </Button>
          )}

          <Button
            onClick={() => {
              setModalInput("");
              setModalType("create-folder");
            }}
            variant="outline"
            className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold border-linkdrive-accent/30 hover:bg-linkdrive-accent/10 text-slate-700 dark:text-white"
          >
            <FolderPlus size={15} className="text-linkdrive-accent" />
            <span>New Folder</span>
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold bg-linkdrive-accent hover:bg-linkdrive-accent/90 text-white shadow-md shadow-linkdrive-accent/20"
          >
            {isUploading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            <span>{isUploading ? "Uploading..." : "Upload to Drive"}</span>
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-black/40 backdrop-blur-sm rounded-xl p-1 border border-white/5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white/10 shadow-sm text-linkdrive-accent"
                  : "text-white/40 hover:text-white/80"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white/10 shadow-sm text-linkdrive-accent"
                  : "text-white/40 hover:text-white/80"
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Disconnect Google Drive Button */}
          <button
            onClick={disconnectDrive}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all"
            title="Disconnect Google Drive integration"
          >
            <Unlink size={14} />
            <span className="hidden md:inline">Disconnect</span>
          </button>
        </div>
      </div>

      {/* ── ERROR OR RECONNECT STATE ── */}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <VaultDriveIcon size={38} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Google Drive Authorization Expired
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
            {error?.includes("invalid_grant") || error?.includes("expired")
              ? "Your Google Drive session has expired or the token was revoked. Reconnect your Google account to restore instant access."
              : error}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => reconnectGoogleDrive()}
              disabled={reconnectingDrive}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 flex items-center gap-2 font-medium shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {reconnectingDrive ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <VaultDriveIcon size={18} />
              )}
              <span>{reconnectingDrive ? "Connecting..." : "Reconnect Google Drive"}</span>
            </Button>
            <Button
              onClick={() => fetchDriveContents()}
              variant="outline"
              className="px-5 py-2.5 text-slate-700 dark:text-white"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      )}

      {/* ── LOADING SKELETON ── */}
      {loading && !error && <FileBrowserSkeleton viewMode={viewMode} />}

      {/* ── EMPTY STATE ── */}
      {!loading && !error && allItems.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <EmptyState
            type="empty"
            title={searchQuery ? "No files matched your search" : "This folder is empty"}
            description={
              searchQuery
                ? "Try searching for a different keyword or file name."
                : "Upload files or create folders to get started with Google Drive."
            }
          />
        </div>
      )}

      {/* ── CONTENT (GRID / LIST) ── */}
      {!loading && !error && allItems.length > 0 && (
        <div
          className="flex-1 overflow-y-auto custom-scrollbar pb-12"
          onClick={handleBackgroundClick}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={handleContainerDrop}
        >
          {/* Folders Section */}
          {data.directories.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-3">
                Folders ({data.directories.length})
              </h4>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
                    : "flex flex-col gap-1.5"
                }
              >
                {data.directories.map((dir) => (
                  <AssetCard
                    key={dir._id}
                    item={dir}
                    viewMode={viewMode}
                    specialView="google-drive"
                    selected={selectedItems.some((i) => i._id === dir._id)}
                    onSelect={handleSelect}
                    onNavigate={handleNavigate}
                    onPreview={handleNavigate}
                    onStarred={handleToggleStar}
                    onRename={(item) => {
                      setModalItem(item);
                      setModalInput(item.name);
                      setModalType("rename");
                    }}
                    onDelete={(item) => {
                      setModalItem(item);
                      setModalType("delete");
                    }}
                    onDownload={handleDownload}
                    onDetails={(item) => setDetailsItem(item)}
                    onCopy={(item) => copyItems([item], "google_drive")}
                    onCut={(item) => cutItems([item], "google_drive")}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverFolderId !== dir._id) setDragOverFolderId(dir._id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget?.contains?.(e.relatedTarget)) {
                        if (dragOverFolderId === dir._id) setDragOverFolderId(null);
                      }
                    }}
                    onDrop={(e) => handleFolderDrop(e, dir)}
                    isDragOver={dragOverFolderId === dir._id}
                    isBeingDragged={activeDragSource?.items?.some((i) => i._id === dir._id)}
                    isCut={
                      clipboard &&
                      clipboard.action === "cut" &&
                      clipboard.items?.some((i) => i._id === dir._id)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {data.files.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-3">
                Files ({data.files.length})
              </h4>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
                    : "flex flex-col gap-1.5"
                }
              >
                {data.files.map((file) => (
                  <AssetCard
                    key={file._id}
                    item={file}
                    viewMode={viewMode}
                    specialView="google-drive"
                    selected={selectedItems.some((i) => i._id === file._id)}
                    onSelect={handleSelect}
                    onNavigate={() => {}}
                    onPreview={handlePreview}
                    onStarred={handleToggleStar}
                    onRename={(item) => {
                      setModalItem(item);
                      setModalInput(item.name);
                      setModalType("rename");
                    }}
                    onDelete={(item) => {
                      setModalItem(item);
                      setModalType("delete");
                    }}
                    onDownload={handleDownload}
                    onDetails={(item) => setDetailsItem(item)}
                    onCopy={(item) => copyItems([item], "google_drive")}
                    onCut={(item) => cutItems([item], "google_drive")}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isBeingDragged={activeDragSource?.items?.some((i) => i._id === file._id)}
                    isCut={
                      clipboard &&
                      clipboard.action === "cut" &&
                      clipboard.items?.some((i) => i._id === file._id)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar bg-white/95 dark:bg-vault-surface/95 backdrop-blur-2xl text-slate-900 dark:text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-2xl border border-slate-200 dark:border-white/10 flex items-center gap-3 sm:gap-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="font-semibold text-xs font-mono">
            {selectedItems.length} selected
          </span>
          {selectedItems.length === 1 && !selectedItems[0].isDirectory && selectedItems[0].type !== "directory" && (
            <>
              <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
              <button
                onClick={() => handlePreview(selectedItems[0])}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-linkdrive-accent transition-colors"
                title="Preview file"
              >
                <Eye size={14} /> Preview
              </button>
            </>
          )}
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
          <button
            onClick={() => copyItems(selectedItems, "google_drive")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-linkdrive-accent transition-colors"
            title="Copy to clipboard"
          >
            <Copy size={14} /> Copy
          </button>
          <button
            onClick={() => cutItems(selectedItems, "google_drive")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-linkdrive-accent transition-colors"
            title="Move to clipboard"
          >
            <Scissors size={14} /> Move
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
          <button
            onClick={() => selectedItems.forEach(handleDownload)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-linkdrive-accent transition-colors"
            title="Download selected"
          >
            <Download size={14} /> Download
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
          <button
            onClick={() => {
              setModalItem(null);
              setModalType("delete");
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-400 transition-colors"
            title="Delete selected"
          >
            <Trash2 size={14} /> Delete
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
          <button
            onClick={() => setSelectedItems([])}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            title="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── CREATE FOLDER / RENAME / DELETE MODAL ── */}
      <Modal
        isOpen={Boolean(modalType)}
        onClose={() => {
          setModalType(null);
          setModalItem(null);
          setModalInput("");
        }}
        title={
          modalType === "create-folder"
            ? "New Google Drive Folder"
            : modalType === "rename"
            ? "Rename in Google Drive"
            : "Delete from Google Drive"
        }
        className="max-w-md"
      >
        <div className="space-y-4 text-slate-900 dark:text-white">
          {modalType === "delete" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">
                    {modalItem ? modalItem.name : `${selectedItems.length} items`}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-white/60 mt-0.5">
                    {modalItem
                      ? "This item will be permanently deleted from Google Drive."
                      : `${selectedItems.length} selected items will be permanently deleted from Google Drive.`}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setModalType(null)}
                  disabled={isSubmittingModal}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isSubmittingModal}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isSubmittingModal ? "Deleting..." : "Delete Permanently"}
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modalType === "create-folder") handleCreateFolder();
                else if (modalType === "rename") handleRename();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-2">
                  {modalType === "create-folder" ? "Folder Name" : "Item Name"}
                </label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder={modalType === "create-folder" ? "e.g. Invoices" : "Name"}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-linkdrive-accent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalType(null)}
                  disabled={isSubmittingModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingModal || !modalInput.trim()}
                  className="bg-linkdrive-accent hover:bg-linkdrive-accent/90 text-white font-bold"
                >
                  {isSubmittingModal
                    ? "Saving..."
                    : modalType === "create-folder"
                    ? "Create Folder"
                    : "Rename"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* ── FILE DETAILS MODAL ── */}
      {detailsItem && (
        <FileDetailsModal
          item={detailsItem}
          isOpen={Boolean(detailsItem)}
          onClose={() => setDetailsItem(null)}
        />
      )}

      {/* ── FILE PREVIEW MODAL ── */}
      {previewFile && (
        <Suspense fallback={null}>
          <FilePreviewModal
            file={previewFile}
            isOpen={Boolean(previewFile)}
            onClose={() => setPreviewFile(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
