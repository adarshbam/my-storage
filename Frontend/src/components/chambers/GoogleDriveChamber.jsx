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
import GoogleDriveConsentModal from "../drive/GoogleDriveConsentModal";
import GoogleDriveConnectView from "./GoogleDriveConnectView";
import {
  ArrowLeft,
  Upload,
  FolderPlus,
  FilePlus,
  FileCode,
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
  Share2,
  FolderInput,
  Check,
} from "lucide-react";
import Editor from "react-simple-code-editor";
import * as Prism from "prismjs";
import { toggleStar, recordItemOpened } from "../../api/files.api";

// Lazy-load Preview Modal
const FilePreviewModal = lazy(() => import("../drive/FilePreviewModal"));

const supportedExtensions = [
  ".txt",
  ".md",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".json",
  ".css",
  ".html",
  ".sql",
];

const getEditorLanguage = (ext) => {
  const map = {
    ".js": "javascript",
    ".jsx": "jsx",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".json": "json",
    ".css": "css",
    ".html": "html",
    ".py": "python",
    ".md": "markdown",
    ".sql": "sql",
  };
  return map[ext] || "text";
};

export default function GoogleDriveChamber() {
  const { driveFolderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || searchParams.get("search") || "";
  const { user, setUser, loading: authLoading } = useAuth();
  const { hasFeature } = usePlan();
  const driveConnected = Boolean(user?.integrations?.googleDrive?.connected);
  const [disconnectedNotice, setDisconnectedNotice] = useState(false);
  const outletContext = useOutletContext() || {};
  const { downloadFile, openShareModal } = outletContext;

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
  const [previewEditMode, setPreviewEditMode] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);

  // Modals state
  const [modalType, setModalType] = useState(null); // 'create-folder', 'create-file', 'rename', 'delete', 'move'
  const [modalItem, setModalItem] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [selectedExt, setSelectedExt] = useState(".txt");
  const [targetMoveFolderId, setTargetMoveFolderId] = useState("root");
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [reconnectingDrive, setReconnectingDrive] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  // Upload file ref
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDraggingFilesOver, setIsDraggingFilesOver] = useState(false);
  const dragCounter = useRef(0);

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
        if (res.status === 403 || res.status === 401 || errData.error?.toLowerCase().includes("not connected") || errData.message?.toLowerCase().includes("not connected")) {
          if (user?.integrations?.googleDrive?.connected) {
            const newUser = { ...user };
            if (newUser.integrations?.googleDrive) {
              newUser.integrations.googleDrive.connected = false;
              setUser(newUser);
            }
          }
        }
        throw new Error(errData.error || errData.message || "Failed to load Google Drive files");
      }

      const resData = await res.json();
      const directories = resData.directories || [];
      const files = resData.files || [];

      setData({ directories, files });
      setDirName(resData.name || (driveFolderId ? "Folder" : "Google Drive"));

      if (driveFolderId && resData.name) {
        recordItemOpened({
          itemId: driveFolderId,
          provider: "google_drive",
          name: resData.name,
          type: "directory",
          size: 0,
        }).catch(() => {});
      }

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
    if (!driveConnected || authLoading) {
      setLoading(false);
      return;
    }
    fetchDriveContents();
    setSelectedItems([]);
  }, [driveFolderId, searchQuery, driveConnected, authLoading]);

  // Listen for global refresh
  useEffect(() => {
    if (!driveConnected || authLoading) return;
    const handleRefresh = () => fetchDriveContents(true);
    window.addEventListener("vault:refresh", handleRefresh);
    return () => window.removeEventListener("vault:refresh", handleRefresh);
  }, [driveFolderId, searchQuery, driveConnected, authLoading]);

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
          if (user) {
            const newUser = { ...user };
            if (!newUser.integrations) newUser.integrations = {};
            newUser.integrations.googleDrive = { connected: true };
            setUser(newUser);
          }
          setError(null);
          setDisconnectedNotice(false);
          setIsConsentModalOpen(false);
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
      setIsConsentModalOpen(false);
    },
    onNonOAuthError: (err) => {
      console.error("Google Drive non-OAuth error:", err);
      setReconnectingDrive(false);
      setIsConsentModalOpen(false);
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
        setData({ directories: [], files: [] });
        setError(null);
        setSelectedItems([]);
        setDisconnectedNotice(true);
        if (driveFolderId) {
          navigate("/dashboard/google-drive");
        }
      }
    } catch (err) {
      console.error("Drive disconnect error:", err);
      alert("Failed to disconnect Google Drive");
    }
  };

  // Upload helper with real-time XMLHttpRequest progress reporting
  const uploadSingleFileWithProgress = (file, parentId, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;
      let speedStr = "0 KB/s";

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          const now = Date.now();
          const deltaSec = (now - lastTime) / 1000;
          if (deltaSec >= 0.25) {
            const deltaBytes = event.loaded - lastLoaded;
            const bytesPerSec = deltaSec > 0 ? deltaBytes / deltaSec : 0;
            if (bytesPerSec > 1024 * 1024) {
              speedStr = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
            } else {
              speedStr = `${Math.round(bytesPerSec / 1024)} KB/s`;
            }
            lastLoaded = event.loaded;
            lastTime = now;
          }
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
            speed: speedStr,
            phase: "uploading",
          });
        }
      };

      xhr.upload.onload = () => {
        onProgress({
          loaded: file.size,
          total: file.size,
          percent: 100,
          speed: "",
          phase: "processing",
        });
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch {
            resolve({ success: true });
          }
        } else {
          let errMsg = `Upload failed (${xhr.status})`;
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.error) errMsg = res.error;
          } catch {}
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network connection error during upload"));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload timed out. Please try again."));
      };

      xhr.timeout = 30 * 60 * 1000; // 30 minutes
      xhr.open("POST", `${SERVER_URL}/drive/file/${parentId}/upload`);
      xhr.withCredentials = true;
      xhr.setRequestHeader("filename", encodeURIComponent(file.name));
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.send(file);
    });
  };

  // Upload file directly to Drive
  const handleFileUpload = async (e) => {
    const rawFiles = e.target?.files || e.dataTransfer?.files || e.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const fileList = Array.from(rawFiles);
    setIsUploading(true);
    const parentId = driveFolderId || "root";

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress({
          active: true,
          phase: "uploading",
          fileName: file.name,
          fileSize: file.size,
          currentIndex: i + 1,
          totalFiles: fileList.length,
          percent: 0,
          loaded: 0,
          total: file.size,
          speed: "Starting...",
        });

        await uploadSingleFileWithProgress(file, parentId, (progressInfo) => {
          setUploadProgress((prev) => ({
            ...prev,
            phase: progressInfo.phase || prev?.phase,
            percent: progressInfo.percent,
            loaded: progressInfo.loaded,
            total: progressInfo.total,
            speed: progressInfo.speed || prev?.speed,
          }));
        });
      }

      setUploadProgress((prev) => ({
        ...prev,
        phase: "complete",
        percent: 100,
      }));

      setTimeout(() => {
        setUploadProgress(null);
      }, 3500);

      fetchDriveContents(true);
    } catch (err) {
      console.error("Drive upload error:", err);
      setUploadProgress((prev) => ({
        ...prev,
        phase: "error",
        error: err.message || "Failed to upload file to Google Drive",
      }));
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
    const parentId = driveFolderId || "root";
    try {
      const res = await fetch(`${SERVER_URL}/drive/folder/${parentId}/create-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modalInput.trim(),
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

  // Create text/code file in Google Drive
  const handleCreateFile = async () => {
    const rawName = modalInput.trim();
    if (!rawName) return;
    const fullName = rawName.endsWith(selectedExt) ? rawName : `${rawName}${selectedExt}`;
    const parentId = driveFolderId || "root";
    setIsSubmittingModal(true);
    try {
      const res = await fetch(`${SERVER_URL}/drive/file/${parentId}/upload`, {
        method: "POST",
        headers: {
          filename: encodeURIComponent(fullName),
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: newFileContent,
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create file");
      }
      setModalType(null);
      setModalInput("");
      setNewFileContent("");
      fetchDriveContents(true);
    } catch (err) {
      console.error("Create file error:", err);
      alert(err.message || "Failed to create file on Google Drive");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Rename item
  const handleRename = async () => {
    if (!modalItem || !modalInput.trim()) return;
    setIsSubmittingModal(true);
    try {
      const res = await fetch(`${SERVER_URL}/drive/file/${modalItem._id}`, {
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
    setPreviewEditMode(false);
    setPreviewFile(file);
    if (file) {
      recordItemOpened({
        itemId: file._id,
        provider: "google_drive",
        name: file.name,
        type: "file",
        size: file.size || 0,
        mimeType: file.mimeType || "",
        metaUrl: file.webViewLink || file.webContentLink || "",
      }).catch(() => {});
    }
  };

  // Direct edit trigger for text/code files (GitHub-style edit button)
  const handleEdit = (file) => {
    setPreviewEditMode(true);
    setPreviewFile(file);
    if (file) {
      recordItemOpened({
        itemId: file._id,
        provider: "google_drive",
        name: file.name,
        type: "file",
        size: file.size || 0,
        mimeType: file.mimeType || "",
        metaUrl: file.webViewLink || file.webContentLink || "",
      }).catch(() => {});
    }
  };

  // Open directory
  const handleNavigate = (dir) => {
    navigate(`/dashboard/google-drive/${dir._id}`);
  };

  // Smart back navigation: parent Google Drive directory or Google Drive root
  const handleGoBack = () => {
    if (breadcrumbs.length >= 2) {
      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
      if (parentCrumb && parentCrumb.id) {
        navigate(`/dashboard/google-drive/${parentCrumb.id}`);
        return;
      }
    }
    navigate("/dashboard/google-drive");
  };

  // Paste handler for Google Drive chamber
  const handlePaste = async () => {
    if (!clipboard || !clipboard.items || clipboard.items.length === 0) return;

    const sourceProviders = new Set(clipboard.items.map((i) => i.provider || "local"));
    const destDriveId = driveFolderId || "root";

    if (sourceProviders.has("google_drive")) {
      // Move within Drive
      try {
        const res = await fetch(`${SERVER_URL}/drive/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: clipboard.items.map((i) => i._id || i.id),
            targetId: destDriveId,
          }),
          credentials: "include",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to move within Drive");
        }
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

  // Top-level Chamber Drag-and-Drop handlers for OS file drop
  const handleRootDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDraggingFilesOver(true);
    }
  };

  const handleRootDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingFilesOver(false);
    }
  };

  const handleRootDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleRootDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDraggingFilesOver(false);
    setDragOverFolderId(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ files: e.dataTransfer.files });
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

  // Background drop handler: drops directly into current Google Drive folder
  const handleContainerDrop = (e) => {
    e.preventDefault();
    setDragOverFolderId(null);

    // If OS files dropped from desktop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ files: e.dataTransfer.files });
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

    const destFolderId = targetFolder._id || targetFolder.id || "root";

    // Check source provider
    const isDrive = items.every((i) => i.provider === "google_drive");
    const isLocal = items.some((i) => !i.provider || i.provider === "local");

    if (isDrive) {
      // Move within Drive
      try {
        const res = await fetch(`${SERVER_URL}/drive/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => i._id || i.id),
            targetId: destFolderId,
          }),
          credentials: "include",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to move within Drive");
        }
        fetchDriveContents(true);
      } catch (err) {
        console.error("Failed to move within Drive", err);
      }
    } else if (isLocal) {
      // Transfer from Vault to this specific folder
      transferVaultToDrive(items, destFolderId);
    }
  };

  // Direct move to target folder
  const handleMove = async (targetId) => {
    const itemsToMove = modalItem ? [modalItem] : selectedItems;
    if (!itemsToMove || itemsToMove.length === 0) return;

    try {
      setIsSubmittingModal(true);
      const res = await fetch(`${SERVER_URL}/drive/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToMove.map((i) => i._id || i.id),
          targetId: targetId || "root",
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to move items on Drive");
      }
      setModalType(null);
      setModalItem(null);
      setSelectedItems([]);
      fetchDriveContents(true);
    } catch (err) {
      console.error("Failed to move items on Drive", err);
      alert(err.message || "Failed to move items on Drive");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const allItems = [...data.directories, ...data.files];

  return (
    <div
      className="flex-1 min-w-0 w-full flex flex-col relative"
      onClick={handleBackgroundClick}
      onDragEnter={handleRootDragEnter}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
      {/* ── DRAG-OVER UPLOAD DROPZONE OVERLAY ── */}
      {isDraggingFilesOver && (
        <div className="absolute inset-0 z-50 bg-accent-soft/20 dark:bg-accent-soft/20 backdrop-blur-[2px] border-2 border-dashed border-accent-primary rounded-3xl flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-all duration-200">
          <div className="w-16 h-16 rounded-2xl bg-accent-soft text-accent-primary flex items-center justify-center mb-3 animate-bounce shadow-lg shadow-accent-glow">
            <Upload size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Drop files here to upload to Google Drive
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Files will be uploaded directly to {dirName || "Google Drive"}
          </p>
        </div>
      )}

      {/* ── CHAMBER HEADER TOOLBAR ── */}
      <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/5">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Smart Back Button: hidden on Google Drive root, navigates to parent or Drive root */}
          {driveConnected && Boolean(driveFolderId) && (
            <button
              onClick={handleGoBack}
              className="p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-200 dark:border-white/10 mr-1 shadow-sm shrink-0 active:scale-95 cursor-pointer"
              title="Go to Parent Folder"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => handleFolderDrop(e, { _id: "root", name: "Google Drive" })}
          >
            <Link
              to="/dashboard/google-drive"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent-soft hover:bg-accent-soft/80 border border-accent-border text-accent-primary font-bold text-sm transition-all duration-150 cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Return to Google Drive root (Drop items here to move to root)"
            >
              <VaultDriveIcon size={18} />
              <span>Google Drive</span>
            </Link>
          </div>

          {!driveConnected && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Chamber Offline
            </span>
          )}

          {driveConnected &&
            breadcrumbs.slice(1).map((b, idx) => (
              <div
                key={b.id || idx}
                className="flex items-center gap-1 text-sm font-medium"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => handleFolderDrop(e, { _id: b.id, name: b.name })}
              >
                <ChevronRight size={14} className="text-slate-400" />
                <Link
                  to={`/dashboard/google-drive/${b.id}`}
                  className="text-slate-600 dark:text-white/70 hover:text-accent-primary transition-colors truncate max-w-[150px]"
                  title={`Navigate or drop to move to ${b.name}`}
                >
                  {b.name}
                </Link>
              </div>
            ))}

          {driveConnected && searchQuery && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-xs font-mono text-slate-300">
              <Search size={12} />
              <span>"{searchQuery}"</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {driveConnected && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            onClick={() => {
              if (selectedItems.length > 0) {
                openShareModal?.(selectedItems);
              } else {
                openShareModal?.([
                  {
                    _id: driveFolderId || "root",
                    name: dirName || "Google Drive",
                    type: "chamber",
                    provider: "google_drive",
                  },
                ]);
              }
            }}
            variant="outline"
            className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold border-accent-border/40 text-accent-primary hover:bg-accent-soft transition-all"
            title="Share via Secure Relay"
          >
            <Share2 size={15} />
            <span>
              {selectedItems.length > 0
                ? `Share (${selectedItems.length})`
                : driveFolderId
                ? "Share Folder"
                : "Share Drive"}
            </span>
          </Button>

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
              className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold border-accent-border bg-accent-soft hover:bg-accent-soft/80 text-accent-primary shadow-sm"
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
            className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold border-accent-border/40 hover:bg-accent-soft text-slate-700 dark:text-white"
          >
            <FolderPlus size={15} className="text-accent-primary" />
            <span>New Folder</span>
          </Button>

          <Button
            onClick={() => {
              setModalInput("");
              setNewFileContent("");
              setSelectedExt(".txt");
              setModalType("create-file");
            }}
            variant="outline"
            className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold border-accent-border/40 hover:bg-accent-soft text-slate-700 dark:text-white"
            title="Create a new text or code file in Google Drive"
          >
            <FilePlus size={15} className="text-accent-primary" />
            <span>New File</span>
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold bg-accent-primary hover:opacity-90 text-accent-foreground shadow-lg shadow-accent-glow/25 relative overflow-hidden transition-all"
          >
            {isUploading ? (
              <Loader2 size={15} className="animate-spin shrink-0" />
            ) : (
              <Upload size={15} className="shrink-0" />
            )}
            <span>
              {isUploading
                ? uploadProgress?.phase === "processing"
                  ? "Processing..."
                  : `Uploading ${uploadProgress?.percent ?? 0}%`
                : "Upload to Drive"}
            </span>
            {isUploading && typeof uploadProgress?.percent === "number" && (
              <div
                className="absolute bottom-0 left-0 h-1 bg-white/50 transition-all duration-200"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            )}
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] rounded-xl p-1 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-white/15 shadow-sm text-slate-900 dark:text-white font-medium"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-white/15 shadow-sm text-slate-900 dark:text-white font-medium"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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
        )}
      </div>

      {/* ── DISCONNECTED OR AUTHORIZATION EXPIRED STATE ── */}
      {(!driveConnected || error) && (
        authLoading ? (
          <FileBrowserSkeleton viewMode={viewMode} />
        ) : (
          <GoogleDriveConnectView
            onConnect={reconnectGoogleDrive}
            isConnecting={reconnectingDrive}
            error={error}
            disconnectedNotice={disconnectedNotice}
            onRetry={fetchDriveContents}
          />
        )
      )}

      {/* ── LOADING SKELETON ── */}
      {driveConnected && loading && !error && <FileBrowserSkeleton viewMode={viewMode} />}

      {/* ── EMPTY STATE ── */}
      {driveConnected && !loading && !error && allItems.length === 0 && (
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
      {driveConnected && !loading && !error && allItems.length > 0 && (
        <div
          className="flex-1 pb-16 px-1 pt-2 sm:px-2"
          onClick={handleBackgroundClick}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={handleContainerDrop}
        >
          {/* Folders Section */}
          {data.directories.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h4 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-4 sm:mb-5">
                Folders ({data.directories.length})
              </h4>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 p-1.5 sm:p-2"
                    : "flex flex-col gap-2 p-1 sm:p-2"
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
                    onShare={(item) => (openShareModal ? openShareModal([item]) : null)}
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
                    onMove={(item) => {
                      setModalItem(item);
                      setTargetMoveFolderId("root");
                      setModalType("move");
                    }}
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
            <div className="mb-8 sm:mb-10">
              <h4 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-4 sm:mb-5">
                Files ({data.files.length})
              </h4>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 p-1.5 sm:p-2"
                    : "flex flex-col gap-2 p-1 sm:p-2"
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
                    onEdit={handleEdit}
                    onStarred={handleToggleStar}
                    onShare={(item) => (openShareModal ? openShareModal([item]) : null)}
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
                    onMove={(item) => {
                      setModalItem(item);
                      setTargetMoveFolderId("root");
                      setModalType("move");
                    }}
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
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-accent-primary transition-colors"
                title="Preview file"
              >
                <Eye size={14} /> Preview
              </button>
            </>
          )}
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
          <button
            onClick={() => copyItems(selectedItems, "google_drive")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-accent-primary transition-colors"
            title="Copy to clipboard"
          >
            <Copy size={14} /> Copy
          </button>
          <button
            onClick={() => cutItems(selectedItems, "google_drive")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-accent-primary transition-colors"
            title="Move to clipboard (Cut)"
          >
            <Scissors size={14} /> Cut
          </button>
          <button
            onClick={() => {
              setModalItem(null);
              setTargetMoveFolderId("root");
              setModalType("move");
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-accent-primary transition-colors"
            title="Move selected items to another folder"
          >
            <FolderInput size={14} /> Move to...
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
          <button
            onClick={() => selectedItems.forEach(handleDownload)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-accent-primary transition-colors"
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

      {/* ── CREATE FOLDER / CREATE FILE / RENAME / DELETE MODAL ── */}
      <Modal
        isOpen={Boolean(modalType)}
        onClose={() => {
          setModalType(null);
          setModalItem(null);
          setModalInput("");
          setNewFileContent("");
        }}
        title={
          modalType === "create-folder"
            ? "New Google Drive Folder"
            : modalType === "create-file"
            ? "New Google Drive File"
            : modalType === "rename"
            ? "Rename in Google Drive"
            : modalType === "move"
            ? "Move in Google Drive"
            : "Delete from Google Drive"
        }
        className={modalType === "create-file" ? "max-w-2xl" : "max-w-md"}
      >
        <div className="space-y-4 text-slate-900 dark:text-white">
          {modalType === "move" ? (
            <div className="space-y-4">
              <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="text-[10px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1">
                  Moving
                </div>
                <div className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                  {modalItem ? modalItem.name : `${selectedItems.length} selected items`}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-2">
                  Choose Destination Folder
                </label>
                <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {/* Google Drive Root */}
                  <button
                    type="button"
                    onClick={() => setTargetMoveFolderId("root")}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      targetMoveFolderId === "root"
                        ? "bg-accent-soft border-accent-border text-accent-primary font-bold shadow-sm"
                        : "border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-white/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <VaultDriveIcon size={18} />
                      <span className="text-sm">Google Drive (Root)</span>
                    </div>
                    {targetMoveFolderId === "root" && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent-soft text-accent-primary border border-accent-border/50">
                        Selected
                      </span>
                    )}
                  </button>

                  {/* Breadcrumb Ancestor Folders */}
                  {breadcrumbs
                    .slice(1)
                    .filter((b) => b.id !== (driveFolderId || "root") && (!modalItem || b.id !== modalItem._id))
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setTargetMoveFolderId(b.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          targetMoveFolderId === b.id
                            ? "bg-accent-soft border-accent-border text-accent-primary font-bold shadow-sm"
                            : "border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-white/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Folder size={18} className="text-accent-primary shrink-0" />
                          <span className="text-sm truncate">{b.name} (Parent)</span>
                        </div>
                        {targetMoveFolderId === b.id && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent-soft text-accent-primary border border-accent-border/50 shrink-0">
                            Selected
                          </span>
                        )}
                      </button>
                    ))}

                  {/* Subfolders in current folder */}
                  {data.directories
                    .filter((d) => !modalItem || d._id !== modalItem._id)
                    .filter((d) => !selectedItems.some((s) => s._id === d._id))
                    .map((dir) => (
                      <button
                        key={dir._id}
                        type="button"
                        onClick={() => setTargetMoveFolderId(dir._id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          targetMoveFolderId === dir._id
                            ? "bg-accent-soft border-accent-border text-accent-primary font-bold shadow-sm"
                            : "border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-white/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Folder size={18} className="text-accent-primary shrink-0" />
                          <span className="text-sm truncate">{dir.name}</span>
                        </div>
                        {targetMoveFolderId === dir._id && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent-soft text-accent-primary border border-accent-border/50 shrink-0">
                            Selected
                          </span>
                        )}
                      </button>
                    ))}
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
                  onClick={() => handleMove(targetMoveFolderId)}
                  disabled={isSubmittingModal}
                  className="bg-accent-primary hover:opacity-90 text-accent-foreground shadow-md shadow-accent-glow font-bold"
                >
                  {isSubmittingModal ? "Moving..." : "Move Here"}
                </Button>
              </div>
            </div>
          ) : modalType === "delete" ? (
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
          ) : modalType === "create-file" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateFile();
              }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-100 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1">
                    Filename
                  </label>
                  <input
                    type="text"
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="e.g. notes or script"
                    autoFocus
                    required
                    className="w-full bg-transparent text-slate-900 dark:text-white font-semibold text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-white/30"
                  />
                </div>
                <div className="hidden sm:block w-px h-8 bg-slate-300 dark:bg-white/10" />
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-1">
                    Extension
                  </label>
                  <select
                    value={selectedExt}
                    onChange={(e) => setSelectedExt(e.target.value)}
                    className="bg-white dark:bg-black/60 text-accent-primary font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 outline-none cursor-pointer"
                  >
                    {supportedExtensions.map((ext) => (
                      <option key={ext} value={ext} className="bg-white dark:bg-[#111113] text-slate-900 dark:text-white">
                        {ext}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Code/Text Editor */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-[#1e1e1e]">
                <div className="px-3 py-2 bg-[#252526] border-b border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Editor ({selectedExt})</span>
                  <span>{newFileContent.split("\n").length} lines</span>
                </div>
                <div className="h-56 overflow-auto custom-scrollbar">
                  <Editor
                    value={newFileContent}
                    onValueChange={(code) => setNewFileContent(code)}
                    highlight={(code) => {
                      const lang = getEditorLanguage(selectedExt);
                      try {
                        const grammar =
                          Prism.languages[lang] ||
                          Prism.languages.javascript ||
                          Prism.languages.clike;
                        return Prism.highlight(code, grammar, lang);
                      } catch {
                        return code;
                      }
                    }}
                    padding={16}
                    style={{
                      fontFamily: '"Fira Code", "Cascadia Code", monospace',
                      fontSize: 13,
                      minHeight: "100%",
                      color: "#e2e8f0",
                      lineHeight: "1.5",
                    }}
                    className="w-full focus:outline-none"
                    placeholder="// Write or paste file content here..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalType(null);
                    setModalInput("");
                    setNewFileContent("");
                  }}
                  disabled={isSubmittingModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingModal || !modalInput.trim()}
                  className="bg-accent-primary hover:opacity-90 text-accent-foreground shadow-md shadow-accent-glow font-bold"
                >
                  {isSubmittingModal ? "Saving..." : "Create File"}
                </Button>
              </div>
            </form>
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
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
                  className="bg-accent-primary hover:opacity-90 text-accent-foreground shadow-md shadow-accent-glow font-bold"
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
            onClose={() => {
              setPreviewFile(null);
              setPreviewEditMode(false);
            }}
            initialEditMode={previewEditMode}
          />
        </Suspense>
      )}

      {/* ── MANDATORY GOOGLE DRIVE CONSENT MODAL ── */}
      <GoogleDriveConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onConfirm={reconnectGoogleDrive}
        isConnecting={reconnectingDrive}
      />

      {/* ── GOOGLE DRIVE UPLOAD PROGRESS HUD ── */}
      {uploadProgress && (
        <div className="fixed bottom-6 right-6 z-[9999] w-96 max-w-[calc(100vw-32px)] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="p-4 rounded-3xl bg-slate-900/95 dark:bg-[#0c0c0e]/95 backdrop-blur-2xl text-white border border-slate-700/60 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.15)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                    uploadProgress.phase === "complete"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : uploadProgress.phase === "error"
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-accent-soft text-accent-primary"
                  )}
                >
                  {uploadProgress.phase === "complete" ? (
                    <Check size={18} />
                  ) : uploadProgress.phase === "error" ? (
                    <AlertTriangle size={18} />
                  ) : uploadProgress.phase === "processing" ? (
                    <Loader2 size={18} className="animate-spin text-accent-primary" />
                  ) : (
                    <Upload size={18} className="animate-pulse text-accent-primary" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    {uploadProgress.phase === "complete"
                      ? "Upload Complete"
                      : uploadProgress.phase === "error"
                      ? "Upload Failed"
                      : uploadProgress.phase === "processing"
                      ? "Processing in Drive..."
                      : "Uploading to Drive"}
                  </h4>
                  <span className="text-[10px] font-mono text-accent-primary font-bold">
                    {uploadProgress.totalFiles > 1
                      ? `File ${uploadProgress.currentIndex} of ${uploadProgress.totalFiles}`
                      : "Direct Stream"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {uploadProgress.phase === "uploading" && uploadProgress.speed && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg bg-white/10 text-white/70">
                    {uploadProgress.speed}
                  </span>
                )}
                {(uploadProgress.phase === "complete" || uploadProgress.phase === "error") && (
                  <button
                    onClick={() => setUploadProgress(null)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* File Info */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 mb-3">
              <div className="font-bold text-xs truncate text-white mb-1" title={uploadProgress.fileName}>
                {uploadProgress.fileName}
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/50 font-mono">
                <span>
                  {uploadProgress.loaded > 0
                    ? `${formatSize(uploadProgress.loaded)} / ${formatSize(uploadProgress.total || uploadProgress.fileSize)}`
                    : formatSize(uploadProgress.fileSize || 0)}
                </span>
                <span
                  className={cn(
                    "font-bold font-mono",
                    uploadProgress.phase === "error"
                      ? "text-rose-400"
                      : uploadProgress.phase === "complete"
                      ? "text-emerald-400"
                      : "text-accent-primary"
                  )}
                >
                  {uploadProgress.phase === "complete"
                    ? "100%"
                    : uploadProgress.phase === "error"
                    ? "Error"
                    : uploadProgress.phase === "processing"
                    ? "Finalizing..."
                    : `${uploadProgress.percent}%`}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-200 ease-out relative overflow-hidden",
                  uploadProgress.phase === "complete"
                    ? "bg-emerald-400"
                    : uploadProgress.phase === "error"
                    ? "bg-rose-500"
                    : "bg-accent-primary"
                )}
                style={{
                  width: `${Math.max(3, Math.min(100, uploadProgress.percent || 0))}%`,
                }}
              >
                {(uploadProgress.phase === "uploading" || uploadProgress.phase === "processing") && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                )}
              </div>
            </div>

            {/* Error message */}
            {uploadProgress.phase === "error" && uploadProgress.error && (
              <div className="mt-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-medium leading-relaxed">
                {uploadProgress.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
