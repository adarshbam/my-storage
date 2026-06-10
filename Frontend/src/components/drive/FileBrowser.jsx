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
import { joinUrl, cn, formatSize } from "../../lib/utils";
import getFileImage from "../../lib/FileImages";
import Button from "../ui/Button";
import Editor from "react-simple-code-editor";
import * as Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism-tomorrow.css";
import Modal from "../ui/Modal";
import AssetCard from "../dashboard/AssetCard";
import FileDetailsModal from "../dashboard/FileDetailsModal";
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
  FilePlus,
  AlertTriangle,
  Maximize,
  Minimize,
  Plus,
  Rocket,
  Lock,
  Globe,
  GitBranch,
  Share2,
  Clock,
  Star,
} from "lucide-react";

// Lazy load the preview modal since it contains heavy syntax highlighter dependencies
const FilePreviewModal = lazy(() => import("./FilePreviewModal"));

export default function FileBrowser({ specialView }) {
  const params = useParams();
  const folderId = params.folderId;
  const githubPath = params["*"];
  const driveFolderId = params.driveFolderId;
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
  const [dirPath, setDirPath] = useState("Vault");
  const [selectedItems, setSelectedItems] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [error, setError] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);

  // --- DRAG SELECTION STATE ---
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const containerRef = useRef(null);

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || searchParams.get("search");
  const searchExt = searchParams.get("ext");
  const searchSize = searchParams.get("size");
  const isSearch =
    location.pathname.endsWith("/search") ||
    !!searchQuery ||
    !!searchExt ||
    !!searchSize;
  const isReadOnly = specialView === "shared" || specialView === "admin";
  const ownerId = searchParams.get("ownerId");

  const handlePreview = (file) => {
    setPreviewFile(file);
  };

  useEffect(() => {
    const onFolderTrigger = () => handleCreateClick();
    const onFileTrigger = () => {
      setModalInput("");
      setModalType("create-file");
      setSelectedExt(".txt");
    };
    document.addEventListener("createFolderTrigger", onFolderTrigger);
    document.addEventListener("createFileTrigger", onFileTrigger);
    return () => {
      document.removeEventListener("createFolderTrigger", onFolderTrigger);
      document.removeEventListener("createFileTrigger", onFileTrigger);
    };
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = joinUrl(SERVER_URL, "directory", folderId || "");

      if (specialView === "shared") {
        url = folderId
          ? joinUrl(SERVER_URL, "directory", folderId)
          : `${SERVER_URL}/share/drives`;
      } else if (specialView === "recent") {
        url = `${SERVER_URL}/file/recent`;
      } else if (specialView === "starred") {
        url = `${SERVER_URL}/file/starred`;
      } else if (specialView === "google-drive") {
        url = `${SERVER_URL}/drive/files`;
      } else if (specialView === "google-drive-folder") {
        url = `${SERVER_URL}/drive/folder/${driveFolderId}`;
      } else if (specialView === "github") {
        url = `${SERVER_URL}/github/repositories`;
      } else if (specialView === "github-repo") {
        const parts = (githubPath || "").split("/");
        const owner = parts[0];
        const repo = parts[1];
        const path = parts.slice(2).join("/");
        const contentPath = path ? `/${path}` : "";
        url = `${SERVER_URL}/github/repositories/${owner}/${repo}/contents${contentPath}${selectedBranch ? `?ref=${selectedBranch}` : ""}`;
      }

      if (isSearch) {
        if (!searchQuery && !searchExt && !searchSize) {
          setLoading(false);
          setData({ directories: [], files: [] });
          setDirName("Search");
          return;
        }
        const filterParams = `${searchExt ? `&ext=${encodeURIComponent(searchExt)}` : ""}${searchSize ? `&size=${encodeURIComponent(searchSize)}` : ""}`;
        if (specialView === "github-repo") {
          const parts = githubPath.split("/");
          const owner = parts[0];
          const repo = parts[1];
          const path = parts.slice(2).join("/");
          url = `${SERVER_URL}/github/repositories/${owner}/${repo}/search?q=${encodeURIComponent(searchQuery || "")}${path ? `&path=${encodeURIComponent(path)}` : ""}${selectedBranch ? `&ref=${selectedBranch}` : ""}`;
        } else if (specialView === "github") {
          url = `${SERVER_URL}/github/repositories`;
        } else if (
          specialView === "google-drive" ||
          specialView === "google-drive-folder"
        ) {
          url = `${SERVER_URL}/drive/search?q=${encodeURIComponent(searchQuery || "")}`;
        } else {
          const parentId = folderId;
          url = `${SERVER_URL}/file/search?q=${encodeURIComponent(searchQuery || "")}${parentId ? `&parentId=${parentId}` : ""}${filterParams}`;
        }
      }

      // Append ownerId if present to delegate Google Drive & GitHub credentials
      if (ownerId) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}ownerId=${ownerId}`;
      }

      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        if (specialView === "shared" && !folderId) {
          const result = await response.json();
          const sharedDrives = (result.sharedAccesses || [])
            .map((access) => {
              const owner = access.userId;
              if (!owner) return null;
              return {
                _id: owner.rootDirId,
                name: `${owner.name}'s Drive`,
                type: "directory",
                ownerEmail: owner.email,
                provider: "shared_drive",
                itemCount: 0,
                size: 0,
              };
            })
            .filter(Boolean);

          setData({
            directories: sharedDrives,
            files: [],
            parentDir: null,
            parentId: null,
          });
          setDirName("Shared with me");
          setLoading(false);
          return;
        }

        const result = await response.json();
        let directories = result.directories || [];
        let files = result.files || [];

        // Hide external integration mount points from administrative eye views
        if (specialView === "admin" || specialView === "owner") {
          directories = directories.filter(
            (dir) =>
              dir.provider !== "google_drive" &&
              dir.provider !== "github" &&
              dir.name !== "Google Drive" &&
              dir.name !== "GitHub",
          );
        }

        if (specialView === "github" && isSearch) {
          const query = searchQuery.toLowerCase();
          directories = directories.filter((repo) =>
            repo.name.toLowerCase().includes(query),
          );
        }

        setData({
          directories,
          files,
          parentDir: result.parentDir,
          parentId: result.parentId ?? null,
        });

        // Cache folder names to resolve paths on the client
        try {
          const cached = JSON.parse(
            sessionStorage.getItem("folder_paths") || "{}",
          );
          if (folderId && result.name) {
            cached[folderId] = {
              name: result.name,
              parentId: result.parentId || null,
            };
          }
          // Cache all child directories in view as well
          directories.forEach((d) => {
            cached[d._id] = {
              name: d.name,
              parentId: d.parentDir || folderId || null,
            };
          });
          sessionStorage.setItem("folder_paths", JSON.stringify(cached));
        } catch (e) {
          console.error("Path cache error:", e);
        }
        setDirPath(result.path);
        setDirName(
          result.name ||
            (isSearch
              ? `Search: ${searchQuery}`
              : specialView === "shared"
                ? "Secure Relay"
                : specialView === "admin"
                  ? "Admin View"
                  : specialView === "recent"
                    ? "Activity Pulse"
                    : specialView === "starred"
                      ? "Priority Beacon"
                      : specialView === "google-drive"
                        ? "Google Drive"
                        : specialView === "github"
                          ? "GitHub"
                          : specialView === "github-repo"
                            ? "Repository"
                            : "Home"),
        );
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Failed to fetch files from server");
        setData({ directories: [], files: [] });
      }
    } catch (error) {
      console.error(error);
      setError(
        error.message === "Failed to fetch"
          ? "Unable to connect to server. Please check if the backend is running."
          : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (specialView !== "github-repo") return;
    try {
      const parts = githubPath.split("/");
      const repoPath = `${parts[0]}/${parts[1]}`;
      const ownerParam = ownerId ? `?ownerId=${ownerId}` : "";

      const repoRes = await fetch(
        `${SERVER_URL}/github/repositories/${repoPath}${ownerParam}`,
        { credentials: "include" },
      );
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        const defaultBranchName = repoData.default_branch || "main";
        if (!selectedBranch) {
          setSelectedBranch(defaultBranchName);
        }
      }

      const response = await fetch(
        `${SERVER_URL}/github/repositories/${repoPath}/branches${ownerParam}`,
        { credentials: "include" },
      );
      if (response.ok) {
        const branchList = await response.json();
        setBranches(branchList);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const lastRepoRef = useRef("");

  useEffect(() => {
    if (specialView === "github-repo") {
      const parts = githubPath?.split("/") || [];
      if (parts.length >= 2) {
        const currentRepo = `${parts[0]}/${parts[1]}`;
        if (currentRepo !== lastRepoRef.current) {
          setSelectedBranch("");
          lastRepoRef.current = currentRepo;
        }
      }
      fetchBranches();
    } else {
      setSelectedBranch("");
      setBranches([]);
      lastRepoRef.current = "";
    }
  }, [githubPath, specialView]);

  useEffect(() => {
    fetchFiles();
    setSelectedItems([]);
    setLastSelectedId(null);
    setCurrentFolderId(
      folderId ||
        (githubPath ? `github:${githubPath}` : null) ||
        (driveFolderId ? `drive:${driveFolderId}` : null),
    );
  }, [
    folderId,
    refreshTrigger,
    location.pathname,
    searchQuery,
    specialView,
    selectedBranch,
  ]);

  // --- HANDLERS ---

  const handleSelect = (item, e) => {
    if (e && e.shiftKey && lastSelectedId) {
      const allItems = [...data.directories, ...data.files];
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
  }, [isDragging, startPoint, data]);

  // --- MODAL STATE ---
  const [modalType, setModalType] = useState(null); // 'create' | 'create-file' | 'rename' | 'delete-github' | null
  const [modalItem, setModalItem] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [selectedExt, setSelectedExt] = useState(".txt");
  const [newFileContent, setNewFileContent] = useState("");
  const [isCreateFullscreen, setIsCreateFullscreen] = useState(false);
  const createModalRef = useRef(null);

  const toggleCreateFullscreen = () => {
    if (!document.fullscreenElement) {
      createModalRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsCreateFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const supportedExtensions = [
    ".txt",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".json",
    ".md",
    ".py",
  ];

  const getLanguage = (ext) => {
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
    };
    return map[ext] || "text";
  };

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

    try {
      let url;
      let method = "POST";
      let body;
      let headers = { "Content-Type": "application/json" };

      if (modalType === "create-repo") {
        url = `${SERVER_URL}/github/repositories`;
        body = JSON.stringify({ name: modalInput, private: isPrivate });
      } else if (modalType === "create") {
        if (
          specialView === "google-drive" ||
          specialView === "google-drive-folder"
        ) {
          const parentId = driveFolderId || "root";
          url = `${SERVER_URL}/drive/folder/${parentId}/create-folder`;
          body = JSON.stringify({ name: modalInput });
        } else if (specialView === "github-repo") {
          // Git doesn't support empty folders, so we create a .gitkeep file inside
          const newPath = githubPath
            ? `${githubPath}/${modalInput}/.gitkeep`
            : `${modalInput}/.gitkeep`;
          const p = newPath.split("/");
          const owner = p[0];
          const repo = p[1];
          const path = p.slice(2).join("/");
          url = `${SERVER_URL}/github/file/${owner}/${repo}/${path}`;
          body = JSON.stringify({
            content: btoa(".gitkeep"), // Base64 for empty or small text
            message: `Create folder ${modalInput}`,
          });
        } else {
          url = `${SERVER_URL}/directory/${folderId || ""}`;
          body = JSON.stringify({ foldername: modalInput });
        }
      } else if (modalType === "create-file") {
        const fullName = modalInput.trim() + selectedExt;
        if (specialView === "github-repo") {
          const p = (githubPath + "/" + fullName).split("/");
          const owner = p[0];
          const repo = p[1];
          const path = p.slice(2).join("/");
          url = `${SERVER_URL}/github/file/${owner}/${repo}/${path}`;
          body = JSON.stringify({
            content: btoa(unescape(encodeURIComponent(newFileContent))),
            message: `Create ${fullName}`,
          });
        } else if (
          specialView === "google-drive" ||
          specialView === "google-drive-folder"
        ) {
          const parentId = driveFolderId || "root";
          url = `${SERVER_URL}/drive/file/${parentId}/upload`;
          headers["filename"] = fullName;
          headers["Content-Type"] = "text/plain";
          body = newFileContent; // Send raw text for Drive upload endpoint
        } else {
          url = folderId
            ? `${SERVER_URL}/file/${folderId}`
            : `${SERVER_URL}/file/`;
          headers["filename"] = fullName;
          body = JSON.stringify({ content: newFileContent });
        }
      } else if (modalType === "rename" && modalItem) {
        if (modalInput === modalItem.name) {
          setModalType(null);
          return;
        }
        const typeEndpoint =
          modalItem.type === "directory" ||
          data.directories.find((d) => d._id === modalItem._id)
            ? "directory"
            : "file";
        const bodyKey =
          typeEndpoint === "directory" ? "newDirName" : "newFileName";
        url = `${SERVER_URL}/${typeEndpoint}/${modalItem._id}`;
        method = "PATCH";
        body = JSON.stringify({ [bodyKey]: modalInput });
      }

      if (ownerId) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}ownerId=${ownerId}`;
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
        credentials: "include",
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Operation failed");
      }

      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setModalType(null);
      fetchFiles();
    } catch (err) {
      console.error("Operation failed", err);
      alert(err.message || "Operation failed");
    }
  };

  // --- HANDLERS ---

  const handleNavigate = (dir) => {
    const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    const targetOwnerId = dir.userId || ownerId;
    const ownerParam = targetOwnerId ? `?ownerId=${targetOwnerId}` : "";

    if (dir.provider === "google_drive") {
      if (
        (specialView === "google-drive" ||
          specialView === "google-drive-folder") &&
        !isObjectId(dir._id)
      ) {
        // Already inside Drive — dir._id is a real Drive folder ID, navigate into it
        navigate(`/dashboard/google-drive/${dir._id}${ownerParam}`);
      } else {
        // Coming from the Vault root or a non-drive view — the dir._id might be a MongoDB ObjectId (mount-point).
        // Always open Drive root listing unless we are sure it's a drive ID.
        navigate(`/dashboard/google-drive${ownerParam}`);
      }
    } else if (dir.provider === "github") {
      if (dir.githubPath) {
        navigate(`/dashboard/github/${dir.githubPath}${ownerParam}`);
      } else {
        navigate(`/dashboard/github${ownerParam}`);
      }
    } else if (dir.provider === "shared_drive" || specialView === "shared") {
      navigate(`/dashboard/shared/folder/${dir._id}${ownerParam}`);
    } else if (specialView === "admin") {
      navigate(`/dashboard/admin/folder/${dir._id}`);
    } else if (specialView === "owner") {
      navigate(`/dashboard/owner/folder/${dir._id}`);
    } else {
      navigate(`/dashboard/folder/${dir._id}`);
    }
  };

  const handleDownload = (item) => {
    if (!item._id) return;

    let url;
    if (item.provider === "google_drive") {
      if (item.type === "directory") {
        url = `${SERVER_URL}/drive/folder/${item._id}/download`;
      } else {
        url = `${SERVER_URL}/drive/file/${item._id}?action=download`;
      }
    } else if (item.provider === "github") {
      if (item.type === "directory") {
        const isRepo = item.githubPath.split("/").length === 2;
        const endpoint = isRepo ? "download" : "folder-download";
        const queryParams = selectedBranch ? `?ref=${selectedBranch}` : "";
        // Extract owner and repo, and conditionally the path for folders
        const parts = item.githubPath.split("/");
        const owner = parts[0];
        const repo = parts[1];
        if (isRepo) {
          url = `${SERVER_URL}/github/repositories/${owner}/${repo}/download${queryParams}`;
        } else {
          const path = parts.slice(2).join("/");
          url = `${SERVER_URL}/github/repositories/${owner}/${repo}/folder-download/${path}${queryParams}`;
        }
      } else {
        const queryParams = selectedBranch ? `?ref=${selectedBranch}` : ""; // Fixed to ?ref= instead of &ref= since there is no other query param
        url = `${SERVER_URL}/github/file/${item.githubPath}?action=download${queryParams.replace("?", "&")}`; // Add action=download and ref
      }
    } else {
      url =
        item.type === "directory"
          ? `${SERVER_URL}/directory/${item._id}?action=download`
          : `${SERVER_URL}/file/${item._id}?action=download`;
    }

    const name = item.type === "directory" ? `${item.name}.zip` : item.name;
    downloadFile(url, name);
  };

  const handleDelete = async (item) => {
    if (item.provider === "github") {
      setModalItem(item);
      setModalType("delete-github");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      let url;

      if (item.provider === "google_drive") {
        // Drive uses a single /drive/file/:id endpoint for both files and folders
        url = `${SERVER_URL}/drive/file/${item._id}`;
      } else {
        const typeEndpoint = data.directories.find((d) => d._id === item._id)
          ? "directory"
          : "file";
        url = `${SERVER_URL}/${typeEndpoint}/${item._id}`;
      }

      if (ownerId) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}ownerId=${ownerId}`;
      }

      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Delete failed");
      }

      fetchFiles();
    } catch (err) {
      console.error("Delete failed", err);
      alert(err.message || "Failed to delete item");
    }
  };

  const confirmDeleteGithub = async () => {
    if (!modalItem) return;

    try {
      const isDirectory = modalItem.type === "directory";
      let url = isDirectory
        ? `${SERVER_URL}/github/repositories/${modalItem.githubPath}${selectedBranch ? `?ref=${selectedBranch}` : ""}`
        : `${SERVER_URL}/github/file/${modalItem.githubPath}`;

      if (ownerId) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}ownerId=${ownerId}`;
      }

      const body = isDirectory
        ? undefined
        : JSON.stringify({ sha: modalItem.sha });

      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        ...(body && { body }),
        credentials: "include",
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Delete failed");
      }

      setModalType(null);
      fetchFiles();
    } catch (err) {
      console.error("Delete failed", err);
      alert(err.message || "Failed to delete item");
    }
  };

  const handleDragStart = (e, item) => {
    let itemsToDrag = [item];
    if (selectedItems.some((i) => i._id === item._id)) {
      itemsToDrag = selectedItems;
    }

    // Ensure type is present for all
    const preparedItems = itemsToDrag.map((i) => ({
      ...i,
      type: i.type || (i.extension ? "file" : "directory"),
    }));

    e.dataTransfer.setData("draggedItems", JSON.stringify(preparedItems));
    e.dataTransfer.setData("draggedItem", JSON.stringify(preparedItems[0]));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnly) return;

    // Handle internal DnD FIRST
    const draggedItemsStr = e.dataTransfer.getData("draggedItems");
    const singleDraggedItemStr = e.dataTransfer.getData("draggedItem");

    let itemsToMove = [];
    if (draggedItemsStr) {
      itemsToMove = JSON.parse(draggedItemsStr);
    } else if (singleDraggedItemStr) {
      itemsToMove = [JSON.parse(singleDraggedItemStr)];
    }

    if (itemsToMove.length > 0) {
      // Filter out if target is one of the moved items (can't move folder into itself)
      if (targetItem && itemsToMove.some((i) => i._id === targetItem._id))
        return;

      const sourceProviders = new Set(
        itemsToMove.map((i) => i.provider || "local"),
      );
      const targetProvider = targetItem?.provider || "local";
      const ownerParam = ownerId ? `?ownerId=${ownerId}` : "";

      // 1. Internal Moves (Same Provider)
      if (sourceProviders.size === 1 && sourceProviders.has(targetProvider)) {
        if (targetProvider === "github" && targetItem.githubPath) {
          try {
            await fetch(`${SERVER_URL}/github/move${ownerParam}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: itemsToMove,
                targetPath: targetItem.githubPath,
              }),
              credentials: "include",
            });
            fetchFiles();
            setSelectedItems([]);
          } catch (err) {
            console.error("GitHub Move failed", err);
          }
          return;
        }

        if (targetProvider === "google_drive") {
          let targetId = targetItem._id;
          if (isObjectId(targetId)) targetId = "root";

          try {
            await fetch(`${SERVER_URL}/drive/move${ownerParam}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: itemsToMove,
                targetId: targetId,
              }),
              credentials: "include",
            });
            fetchFiles();
            setSelectedItems([]);
          } catch (err) {
            console.error("Drive Move failed", err);
          }
          return;
        }

        if (targetProvider === "local") {
          try {
            await fetch(
              `${SERVER_URL}/directory/${targetItem._id}/move${ownerParam}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(itemsToMove),
                credentials: "include",
              },
            );
            fetchFiles();
            setSelectedItems([]);
          } catch (err) {
            console.error("Move failed", err);
          }
          return;
        }
      }

      // 2. Cross-Provider Transfers

      // Drive -> Vault
      if (sourceProviders.has("google_drive") && targetProvider === "local") {
        let targetFolderId = targetItem._id;
        if (!targetFolderId || targetFolderId === "root")
          targetFolderId = user?.rootDirectoryId;

        try {
          await fetch(`${SERVER_URL}/drive/transfer-to-vault${ownerParam}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: itemsToMove.filter((i) => i.provider === "google_drive"),
              targetFolderId: targetFolderId,
            }),
            credentials: "include",
          });
          fetchFiles();
          setSelectedItems([]);
        } catch (err) {
          console.error("Transfer to Vault failed", err);
        }
        return;
      }

      // Vault -> Drive
      if (sourceProviders.has("local") && targetProvider === "google_drive") {
        let targetDriveFolderId = targetItem._id;
        if (!targetDriveFolderId || isObjectId(targetDriveFolderId))
          targetDriveFolderId = "root";

        try {
          await fetch(`${SERVER_URL}/drive/transfer-from-vault${ownerParam}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: itemsToMove.filter(
                (i) => !i.provider || i.provider === "local",
              ),
              targetDriveFolderId: targetDriveFolderId,
            }),
            credentials: "include",
          });
          fetchFiles();
          setSelectedItems([]);
        } catch (err) {
          console.error("Transfer from Vault failed", err);
        }
        return;
      }

      return;
    }

    // Handle Desktop Upload SECOND
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      let targetDirId = folderId; // default to current vault folder

      if (targetItem && targetItem._id) {
        if (targetItem.provider === "github" && targetItem.githubPath) {
          targetDirId = `github:${targetItem.githubPath}`;
        } else if (targetItem.provider === "google_drive") {
          targetDirId = isObjectId(targetItem._id)
            ? `drive:root`
            : `drive:${targetItem._id}`;
        } else {
          targetDirId = targetItem._id;
        }
      } else if (
        specialView === "google-drive" ||
        specialView === "google-drive-folder"
      ) {
        targetDirId = `drive:${driveFolderId || "root"}`;
      }

      uploadFile(files, targetDirId);
      return;
    }
  };

  const handleZoneDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleZoneDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnly) return;

    // Check if it's an internal drag landing in the empty zone
    const draggedItemsStr = e.dataTransfer.getData("draggedItems");
    const singleDraggedItemStr = e.dataTransfer.getData("draggedItem");

    if (draggedItemsStr || singleDraggedItemStr) {
      // It's an internal drag. Target is the CURRENT folder.
      let target = null;
      if (
        specialView === "google-drive" ||
        specialView === "google-drive-folder"
      ) {
        target = { id: driveFolderId || "root", provider: "google_drive" };
      } else if (specialView === "github-repo") {
        target = { githubPath: githubPath, provider: "github" };
      } else {
        target = { id: folderId || user?.rootDirectoryId };
      }
      handleDrop(e, target);
      return;
    }

    // Otherwise handle desktop upload
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      let targetDirId = folderId;
      if (
        specialView === "google-drive" ||
        specialView === "google-drive-folder"
      ) {
        targetDirId = `drive:${driveFolderId || "root"}`;
      }
      uploadFile(files, targetDirId);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col relative"
      onDrop={handleZoneDrop}
      onDragOver={handleZoneDragOver}
    >
      <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2 pb-5 mb-5 border-b border-white/5 shrink-0 px-2">
        <div className="flex items-center gap-2 shrink-0">
          {(data.parentDir ||
            (specialView === "shared" && folderId) ||
            specialView === "admin" ||
            specialView === "google-drive" ||
            specialView === "google-drive-folder" ||
            specialView === "github-repo" ||
            specialView === "github") && (
            <button
              onClick={() => {
                if (specialView === "google-drive-folder") {
                  if (data.parentId && data.parentId !== "root") {
                    navigate(`/dashboard/google-drive/${data.parentId}`);
                  } else {
                    navigate(`/dashboard/google-drive`);
                  }
                } else if (specialView === "shared") {
                  if (data.parentDir) {
                    navigate(`/dashboard/shared/folder/${data.parentDir}`);
                  } else {
                    navigate("/dashboard/shared");
                  }
                } else if (specialView === "admin") {
                  if (data.parentDir) {
                    navigate(`/dashboard/admin/folder/${data.parentDir}`);
                  } else {
                    navigate("/users");
                  }
                } else if (specialView === "github") {
                  navigate("/dashboard");
                } else if (specialView === "google-drive") {
                  navigate("/dashboard");
                } else if (specialView === "github-repo") {
                  const parts = (githubPath || "").split("/").filter(Boolean);
                  if (parts.length <= 2) {
                    navigate("/dashboard/github");
                  } else {
                    navigate(
                      `/dashboard/github/${parts.slice(0, -1).join("/")}`,
                    );
                  }
                } else if (data.parentDir === user?.rootDirectoryId) {
                  navigate("/dashboard");
                } else {
                  navigate(`/dashboard/folder/${data.parentDir}`);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isReadOnly) return;
                if (specialView === "google-drive-folder") {
                  const parentId = data.parentId || "root";
                  handleDrop(e, { id: parentId, provider: "google_drive" });
                } else if (specialView === "google-drive") {
                  // Dragging from Drive root back to Vault root
                  handleDrop(e, { id: user?.rootDirectoryId });
                } else if (specialView === "github-repo") {
                  const parts = (githubPath || "").split("/").filter(Boolean);
                  if (parts.length > 2) {
                    const parentPath = parts.slice(0, -1).join("/");
                    handleDrop(e, {
                      githubPath: parentPath,
                      provider: "github",
                    });
                  } else {
                    // Back to Github repositories list? No, that's just a view.
                    // But we could transfer from GitHub to local here too.
                    handleDrop(e, { id: user?.rootDirId });
                  }
                } else if (specialView === "github") {
                  handleDrop(e, { id: user?.rootDirId });
                } else if (data.parentDir) {
                  handleDrop(e, { id: data.parentDir });
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/20 mr-2"
              title="Go Back"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-2xl capitalize font-bold text-white flex items-center gap-2 drop-shadow-md tracking-wide">
            {Array.isArray(dirPath) &&
              dirPath.map(({ _id, name }, index) => (
                <button
                  key={_id}
                  onClick={() => navigate(`/dashboard/folder/${_id}`)}
                >
                  {name} {dirPath.length - 1 != index ? "/" : ""}
                </button>
              ))}
            {folderId && !isSearch && !isReadOnly && (
              <button
                onClick={() => {
                  setModalItem({
                    _id: folderId,
                    name: dirName,
                    type: "directory",
                  });
                  setModalInput(dirName);
                  setModalType("rename");
                }}
                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-all ml-2"
                title="Rename Folder"
              >
                <Edit2 size={16} />
              </button>
            )}
          </h2>

          {specialView === "github-repo" && branches.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm border border-black/10 dark:border-white/10 rounded-lg shadow-sm">
              <GitBranch size={14} className="text-[#14b8a6] shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="" className="dark:bg-[#1a1a1c]">
                  Default
                </option>
                {branches.map((branch) => (
                  <option
                    key={branch}
                    value={branch}
                    className="dark:bg-[#1a1a1c]"
                  >
                    {branch}
                  </option>
                ))}
              </select>
            </div>
          )}
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
        </div>
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            Connection Error
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            {error}
          </p>
          <Button
            onClick={fetchFiles}
            className="bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-white px-8"
          >
            Retry Connection
          </Button>
          <p className="mt-4 text-xs text-slate-400">
            Current Server:{" "}
            <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
              {SERVER_URL}
            </code>
          </p>
        </div>
      ) : loading ? (
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

          {data.directories.map((dir) => (
            <AssetCard
              id={`file-card-${dir._id}`}
              key={dir._id}
              item={dir}
              selected={selectedItems.some((i) => i._id === dir._id)}
              onSelect={(item, e) => handleSelect(item, e)}
              onNavigate={handleNavigate}
              onRename={handleRenameClick}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onPreview={handlePreview}
              onDetails={(item) => setDetailsItem(item)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              viewMode={viewMode}
              readOnly={isReadOnly}
              isIntegrationRoot={
                (!specialView &&
                  (dir.provider === "google_drive" ||
                    dir.provider === "github")) ||
                (specialView === "github" && dir.provider === "github")
              }
            />
          ))}
          {data.files.map((file) => (
            <AssetCard
              id={`file-card-${file._id}`}
              key={file._id}
              item={file}
              selected={selectedItems.some((i) => i._id === file._id)}
              onSelect={(item, e) => handleSelect(item, e)}
              onNavigate={() => {}} // Files don't navigate
              onRename={handleRenameClick}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onPreview={handlePreview}
              onDetails={(item) => setDetailsItem(item)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              viewMode={viewMode}
              readOnly={isReadOnly}
            />
          ))}

          {data.directories.length === 0 && data.files.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              {specialView ? (
                <>
                  <div
                    className={cn(
                      "p-6 rounded-full mb-4 shadow-lg text-white/40 border border-white/5 bg-white/[0.02]",
                      specialView === "shared" &&
                        "shadow-[0_0_30px_rgba(155,77,255,0.15)] text-relay-accent/80 border-relay-accent/20",
                      specialView === "recent" &&
                        "shadow-[0_0_30px_rgba(0,207,255,0.15)] text-pulse-accent/80 border-pulse-accent/20",
                      specialView === "starred" &&
                        "shadow-[0_0_30px_rgba(255,209,102,0.15)] text-beacon-accent/80 border-beacon-accent/20",
                    )}
                  >
                    {specialView === "shared" ? (
                      <Share2 size={40} />
                    ) : specialView === "recent" ? (
                      <Clock size={40} />
                    ) : specialView === "starred" ? (
                      <Star size={40} />
                    ) : (
                      <Upload size={40} />
                    )}
                  </div>
                  <p className="text-lg font-medium mb-2">
                    {isSearch
                      ? "No search results found"
                      : specialView === "shared"
                        ? "No secure relays active"
                        : specialView === "recent"
                          ? "No recent activity pulse"
                          : specialView === "starred"
                            ? "No priority beacons found"
                            : "No files yet"}
                  </p>
                  {!isSearch && (
                    <p className="text-sm text-white/40 max-w-sm text-center">
                      {specialView === "shared"
                        ? "Shared access vaults from other nodes will appear here once authenticated."
                        : specialView === "recent"
                          ? "Your recently accessed or modified vault assets will be indexed here."
                          : specialView === "starred"
                            ? "Star your critical assets or directories to beacon them to this control panel."
                            : ""}
                    </p>
                  )}
                  {specialView === "github-repo" && !isSearch && (
                    <button
                      onClick={() => {
                        setModalInput("README.md");
                        setModalType("create-file");
                        setSelectedExt(".md");
                        setNewFileContent(
                          "# New Repository\n\nThis is an empty repository.",
                        );
                      }}
                      className="mt-4 px-6 py-2 bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white rounded-xl hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Initialize with README.md
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div
                    className="bg-white/40 dark:bg-white/[0.03] p-6 rounded-full mb-4 cursor-pointer hover:bg-white/60 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_0_30px_rgba(20,184,166,0.06)] dark:shadow-[0_0_30px_rgba(20,184,166,0.1)]"
                    onClick={openUploadModal}
                  >
                    <Upload size={40} />
                  </div>
                  <p className="text-lg font-medium mb-2">
                    {isSearch
                      ? "No search results found"
                      : "This folder is empty"}
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
      {selectedItems.length > 0 && !isReadOnly && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-white/[0.06] backdrop-blur-2xl text-slate-900 dark:text-white px-6 py-3 rounded-full shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/[0.08] flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="font-medium text-sm">
            {selectedItems.length} selected
          </span>
          <div className="h-4 w-px bg-slate-700"></div>
          <button
            onClick={async () => {
              if (!confirm(`Delete ${selectedItems.length} items?`)) return;
              const deletePromises = selectedItems.map((item) => {
                const ownerParam = ownerId ? `?ownerId=${ownerId}` : "";
                if (item.provider === "google_drive") {
                  return fetch(
                    `${SERVER_URL}/drive/file/${item._id}${ownerParam}`,
                    {
                      method: "DELETE",
                      credentials: "include",
                    },
                  );
                } else if (item.provider === "github") {
                  return fetch(
                    `${SERVER_URL}/github/file/${item.githubPath}${ownerParam}`,
                    {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sha: item.sha }),
                      credentials: "include",
                    },
                  );
                } else {
                  const typeEndpoint = data.directories.find(
                    (d) => d._id === item._id,
                  )
                    ? "directory"
                    : "file";
                  return fetch(
                    `${SERVER_URL}/${typeEndpoint}/${item._id}${ownerParam}`,
                    {
                      method: "DELETE",
                      credentials: "include",
                    },
                  );
                }
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
        onClose={() => {
          if (document.fullscreenElement) document.exitFullscreen();
          setModalType(null);
          setModalInput("");
          setNewFileContent("");
        }}
        className={cn(
          modalType === "create-file" ? "max-w-4xl" : "max-w-md",
          isCreateFullscreen &&
            "max-w-none w-full h-full rounded-none border-none",
        )}
        headerActions={
          modalType === "create-file" && (
            <button
              onClick={toggleCreateFullscreen}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title={isCreateFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isCreateFullscreen ? (
                <Minimize size={20} />
              ) : (
                <Maximize size={20} />
              )}
            </button>
          )
        }
        title={
          modalType === "create"
            ? "Create New Folder"
            : modalType === "create-file"
              ? "Create New File"
              : modalType === "create-repo"
                ? "Create New GitHub Repository"
                : modalType === "rename"
                  ? "Rename Item"
                  : "Danger: Permanent Deletion"
        }
      >
        <div
          ref={createModalRef}
          className={cn(
            "bg-white dark:bg-slate-900",
            isCreateFullscreen && "h-full flex flex-col p-4",
          )}
        >
          {modalType === "delete-github" ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-red-800 dark:text-red-200 font-semibold text-lg leading-tight">
                    Wait! This is permanent.
                  </h3>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    You are about to delete{" "}
                    <strong className="text-red-700 dark:text-red-100">
                      {modalItem?.name}
                    </strong>{" "}
                    from GitHub. This action will create a direct commit and
                    cannot be undone.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500">Repository</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {modalItem?.githubPath?.split("/").slice(0, 2).join("/")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500">Action Type</span>
                  <span className="text-red-500 font-semibold">
                    COMMIT_DELETE
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setModalType(null)}
                  className="hover:bg-slate-100 dark:hover:bg-slate-800 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteGithub}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 px-6 border-none"
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          ) : modalType === "create-file" ? (
            <form
              onSubmit={handleModalSubmit}
              className={cn(
                "space-y-4",
                isCreateFullscreen && "flex-1 flex flex-col",
              )}
            >
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Filename
                  </label>
                  <input
                    type="text"
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    className="w-full bg-transparent text-slate-900 dark:text-white font-medium focus:outline-none text-lg"
                    placeholder="untitled"
                    autoFocus
                  />
                </div>
                <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 mx-2"></div>
                <div className="w-32">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Extension
                  </label>
                  <select
                    value={selectedExt}
                    onChange={(e) => setSelectedExt(e.target.value)}
                    className="w-full bg-transparent text-[#14b8a6] font-bold focus:outline-none appearance-none cursor-pointer text-lg"
                  >
                    {supportedExtensions.map((ext) => (
                      <option
                        key={ext}
                        value={ext}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {ext}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className={cn(
                  "relative group bg-[#1e1e1e] rounded-xl border border-black/10 dark:border-white/5 overflow-hidden flex flex-col",
                  isCreateFullscreen ? "flex-1" : "h-64",
                )}
              >
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <Editor
                    value={newFileContent}
                    onValueChange={(code) => setNewFileContent(code)}
                    highlight={(code) => {
                      const lang = getLanguage(selectedExt);
                      try {
                        const grammar =
                          Prism.languages[lang] ||
                          Prism.languages.javascript ||
                          Prism.languages.clike;
                        return Prism.highlight(code, grammar, lang);
                      } catch (e) {
                        return code;
                      }
                    }}
                    padding={16}
                    style={{
                      fontFamily: '"Cascadia Code", "Fira Code", monospace',
                      fontSize: 13,
                      minHeight: "100%",
                      color: "#d4d4d4",
                    }}
                    className="w-full focus:outline-none"
                  />
                </div>
                <div className="px-3 py-1 bg-[#007acc] flex justify-between items-center text-[10px] text-white font-medium uppercase tracking-wider">
                  <span>{getLanguage(selectedExt)} Mode</span>
                  <span>Ready to Create</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 italic">
                  Final:{" "}
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-medium">
                    {modalInput || "untitled"}
                    {selectedExt}
                  </span>
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (document.fullscreenElement) document.exitFullscreen();
                      setModalType(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white border-none shadow-lg shadow-[#14b8a6]/20 px-8"
                  >
                    Create & Save
                  </Button>
                </div>
              </div>
            </form>
          ) : (
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
                  placeholder={
                    modalType === "create-repo"
                      ? "Enter repository name..."
                      : "Enter name..."
                  }
                  autoFocus
                />
              </div>

              {modalType === "create-repo" && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    {isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                    <span>
                      {isPrivate ? "Private Repository" : "Public Repository"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:ring-offset-2",
                      isPrivate
                        ? "bg-[#14b8a6]"
                        : "bg-slate-200 dark:bg-slate-700",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        isPrivate ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalType(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {modalType === "create"
                    ? "Create Folder"
                    : modalType === "create-repo"
                      ? "Create Repository"
                      : "Rename"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* New Vault OS Details Modal */}
      {detailsItem && (
        <FileDetailsModal
          item={detailsItem}
          onClose={() => setDetailsItem(null)}
        />
      )}

      <Suspense fallback={null}>
        {!!previewFile && (
          <FilePreviewModal
            file={previewFile}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
            ownerId={ownerId}
          />
        )}
      </Suspense>
    </div>
  );
}
