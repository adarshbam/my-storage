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
import { joinUrl, cn, formatSize, getUser, isSpecialFolder } from "../../lib/utils";
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
import PlanStatusBanner from "../dashboard/PlanStatusBanner";
import SecureRelayView from "../relay/SecureRelayView";
import { usePlan } from "../../context/PlanContext";
import { useGoogleLogin } from "@react-oauth/google";
import { VaultDriveIcon } from "../ui/VaultIcons";
import FileBrowserSkeleton from "./FileBrowserSkeleton";
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
  GitCommit,
  GitPullRequest,
  Folder,
  Share2,
  Clock,
  Star,
  Scissors,
  Copy,
  Clipboard,
  Tag,
  Workflow,
  FolderGit2,
  CloudUpload,
} from "lucide-react";

import { batchDelete } from "../../api/files.api";
import { useFiles } from "../../hooks/useFiles";
import { useSelectionBox } from "../../hooks/useSelectionBox";
import { useClipboard } from "../../hooks/useClipboard";
import { useFileOperations } from "../../hooks/useFileOperations";
import { useContextMenu } from "../../hooks/useContextMenu";

import SelectionBox from "./SelectionBox";
import EmptyState from "./EmptyState";
import { useFileKeyboardNavigation } from "../../hooks/useFileKeyboardNavigation";
import FileOperationModals from "./FileOperationModals";
import FilePreviewSkeleton from "./FilePreviewSkeleton";
import { prefetchFileContent } from "../../lib/fileCache";

import GitCommitHistoryView from "../git/GitCommitHistoryView";
import GitBranchManager from "../git/GitBranchManager";
import GitPullRequestsView from "../git/GitPullRequestsView";
import GitOperationsPanel from "../git/GitOperationsPanel";
import GitFileHistoryModal from "../git/GitFileHistoryModal";
import GitWorkspaceBar from "../git/GitWorkspaceBar";
import GitStagingWorkbenchModal from "../git/GitStagingWorkbenchModal";
import GitStashDrawer from "../git/GitStashDrawer";
import GitFolderBackupModal from "../git/GitFolderBackupModal";
import GitCloneRepoModal from "../git/GitCloneRepoModal";
import GitReleasesView from "../git/GitReleasesView";
import GitActionsWorkflowView from "../git/GitActionsWorkflowView";

// Preload the preview modal module immediately in the background for zero-delay instant opening
const filePreviewPromise = import("./FilePreviewModal");
const FilePreviewModal = lazy(() => filePreviewPromise);

export default function FileBrowser({ specialView }) {
  const params = useParams();
  const folderId = params.folderId;
  const githubPath = params["*"];
  const driveFolderId = params.driveFolderId;
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const {
    openUploadModal,
    openShareModal,
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
  const [ownerName, setOwnerName] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [error, setError] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);
  const folderCache = useRef(new Map());

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBranch = searchParams.get("ref");
  const activeGitTab = searchParams.get("tab") || "files";
  const [fileForHistory, setFileForHistory] = useState(null);

  // New Git Workspace & Feature Modal states
  const [showStagingModal, setShowStagingModal] = useState(false);
  const [showStashDrawer, setShowStashDrawer] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupTargetDirectory, setBackupTargetDirectory] = useState(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [clonePreselectedRepo, setClonePreselectedRepo] = useState(null);

  const searchQuery = searchParams.get("q") || searchParams.get("search");
  const searchExt = searchParams.get("ext");
  const searchSize = searchParams.get("size");
  const isSearch =
    location.pathname.endsWith("/search") ||
    !!searchQuery ||
    !!searchExt ||
    !!searchSize;
  const { isNoPlan, rules } = usePlan();
  const planAllowsMutation = !isNoPlan && (rules?.permissions?.allowUpload ?? true);
  const isReadOnly =
    specialView === "shared" ||
    specialView === "admin" ||
    !planAllowsMutation;
  const ownerId = searchParams.get("ownerId");

  const githubParts = (githubPath || "").split("/");
  const githubOwner = githubParts[0] || "";
  const githubRepo = githubParts[1] || "";
  const githubSubpath = githubParts.slice(2).join("/");

  const isGitWorkspace =
    !specialView &&
    (!!data.gitWorkspace?.repoName ||
      data.provider === "git_workspace" ||
      (Array.isArray(dirPath) && dirPath.some((d) => d?.provider === "git_workspace")));

  const handleBranchChange = (newBranch) => {
    setSelectedBranch(newBranch);
    const nextParams = new URLSearchParams(searchParams);
    if (newBranch) {
      nextParams.set("ref", newBranch);
    } else {
      nextParams.delete("ref");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleGitTabChange = (newTab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newTab && newTab !== "files") {
      nextParams.set("tab", newTab);
    } else {
      nextParams.delete("tab");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const {
    clipboard,
    updateClipboard,
    handleCopyItem,
    handleCutItem,
    handleCopySelected,
    handleCutSelected,
    handlePaste,
  } = useClipboard({
    folderId,
    fetchFiles: () => fetchFiles(),
    specialView,
    ownerId,
    isReadOnly,
    selectedItems,
    setSelectedItems,
    driveFolderId,
    githubPath,
    user,
  });

  const [reconnectingDrive, setReconnectingDrive] = useState(false);

  const reconnectGoogleDrive = useGoogleLogin({
    flow: "auth-code",
    prompt: "consent",
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/drive",
    onSuccess: async (codeResponse) => {
      try {
        setReconnectingDrive(true);
        setError(null);
        const res = await fetch(`${SERVER_URL}/drive/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code }),
          credentials: "include",
        });
        if (res.ok) {
          await getUser(setUser);
          await fetchFiles(true);
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

  // --- DRAG SELECTION STATE ---
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const containerRef = useRef(null);

  const getBreadcrumbs = () => {
    const list = [];
    const ownerParam = ownerId ? `?ownerId=${ownerId}` : "";

    // 1. Root Segment
    if (
      specialView === "google-drive" ||
      specialView === "google-drive-folder"
    ) {
      list.push({
        label: "Google Drive",
        path: `/dashboard/google-drive${ownerParam}`,
      });
    } else if (specialView === "github" || specialView === "github-repo") {
      list.push({
        label: "GitHub",
        path: `/dashboard/github${ownerParam}`,
      });
    } else if (specialView === "shared") {
      list.push({
        label: "Secure Relay",
        path: `/dashboard/shared${ownerParam}`,
      });
    } else if (specialView === "recent") {
      list.push({
        label: "Activity Pulse",
        path: `/dashboard/recent${ownerParam}`,
      });
    } else if (specialView === "starred") {
      list.push({
        label: "Priority Beacon",
        path: `/dashboard/starred${ownerParam}`,
      });
    } else if (specialView === "admin") {
      list.push({
        label: "Admin View",
        path: `/dashboard/admin${ownerParam}`,
      });
    } else {
      // Local vault
      list.push({
        label: "Vault Chamber",
        path: `/dashboard${ownerParam}`,
      });
    }

    // 2. Middle & End Segments
    if (specialView === "google-drive-folder" && driveFolderId) {
      try {
        const cached = JSON.parse(
          sessionStorage.getItem("folder_paths") || "{}",
        );
        const drivePath = [];
        let currentId = driveFolderId;

        while (currentId && currentId !== "root" && cached[currentId]) {
          drivePath.unshift({
            label: cached[currentId].name,
            path: `/dashboard/google-drive/${currentId}${ownerParam}`,
          });
          currentId = cached[currentId].parentId;
        }

        list.push(...drivePath);
      } catch (e) {
        console.error("Error building Drive path:", e);
        if (dirName && dirName !== "Google Drive") {
          list.push({
            label: dirName,
            path: `/dashboard/google-drive/${driveFolderId}${ownerParam}`,
          });
        }
      }
    } else if (specialView === "github-repo" && githubPath) {
      const parts = githubPath.split("/").filter(Boolean);
      if (parts.length > 0) {
        const ownerRepo = parts.slice(0, 2).join("/");
        list.push({
          label: ownerRepo,
          path: `/dashboard/github/${ownerRepo}${ownerParam}`,
        });

        let currentPath = ownerRepo;
        for (let i = 2; i < parts.length; i++) {
          currentPath += `/${parts[i]}`;
          list.push({
            label: parts[i],
            path: `/dashboard/github/${currentPath}${ownerParam}`,
          });
        }
      }
    } else if (Array.isArray(dirPath) && dirPath.length > 0) {
      const currentOwner = ownerName || data?.ownerName;
      const isOtherVault =
        specialView === "owner" ||
        specialView === "admin" ||
        (data?.userId && user?._id && data.userId.toString() !== user._id.toString()) ||
        Boolean(ownerId);

      dirPath.forEach(({ _id, name }, index) => {
        if (_id === user?.rootDirId) return;

        let pathUrl = `/dashboard/folder/${_id}${ownerParam}`;
        if (specialView === "shared") {
          pathUrl = `/dashboard/shared/folder/${_id}${ownerParam}`;
        } else if (specialView === "admin") {
          pathUrl = `/dashboard/admin/folder/${_id}${ownerParam}`;
        } else if (specialView === "owner") {
          pathUrl = `/dashboard/owner/folder/${_id}${ownerParam}`;
        }

        let label = name;
        if (
          index === 0 &&
          (name === "Vault" || name?.endsWith("'s Vault") || name?.endsWith("' Vault")) &&
          isOtherVault &&
          currentOwner
        ) {
          label = `${currentOwner}'s Vault`;
        }

        list.push({
          label,
          path: pathUrl,
        });
      });
    } else if (folderId && dirName) {
      let pathUrl = `/dashboard/folder/${folderId}${ownerParam}`;
      if (specialView === "shared") {
        pathUrl = `/dashboard/shared/folder/${folderId}${ownerParam}`;
      } else if (specialView === "admin") {
        pathUrl = `/dashboard/admin/folder/${folderId}${ownerParam}`;
      } else if (specialView === "owner") {
        pathUrl = `/dashboard/owner/folder/${folderId}${ownerParam}`;
      }

      let label = dirName;
      const currentOwner = ownerName || data?.ownerName;
      const isOtherVault =
        specialView === "owner" ||
        specialView === "admin" ||
        (data?.userId && user?._id && data.userId.toString() !== user._id.toString()) ||
        Boolean(ownerId);

      if (
        (dirName === "Vault" || dirName?.endsWith("'s Vault") || dirName?.endsWith("' Vault")) &&
        isOtherVault &&
        currentOwner
      ) {
        label = `${currentOwner}'s Vault`;
      }

      list.push({
        label,
        path: pathUrl,
      });
    }

    return list;
  };

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
    const onRepoTrigger = () => {
      setModalInput("");
      setIsPrivate(false);
      setModalType("create-repo");
    };
    document.addEventListener("createFolderTrigger", onFolderTrigger);
    document.addEventListener("createFileTrigger", onFileTrigger);
    document.addEventListener("createRepoTrigger", onRepoTrigger);
    return () => {
      document.removeEventListener("createFolderTrigger", onFolderTrigger);
      document.removeEventListener("createFileTrigger", onFileTrigger);
      document.removeEventListener("createRepoTrigger", onRepoTrigger);
    };
  }, []);

  const fetchFiles = async (forceRefresh = false) => {
    const cacheKey = `${specialView || "drive"}:${folderId || "root"}:${isSearch ? searchQuery || "" : ""}:${selectedBranch || ""}:${driveFolderId || ""}:${githubPath || ""}:${ownerId || ""}`;
    const cachedEntry = folderCache.current?.get(cacheKey);

    if (cachedEntry && !forceRefresh) {
      setData(cachedEntry.data);
      if (cachedEntry.dirName) setDirName(cachedEntry.dirName);
      if (cachedEntry.dirPath) setDirPath(cachedEntry.dirPath);
      if (cachedEntry.ownerName) setOwnerName(cachedEntry.ownerName);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    // Refresh user storage in background without blocking directory load
    getUser(setUser).catch(() => {});

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
          const dirs = [];
          const files = [];

          (result.sharedAccesses || []).forEach((access) => {
            const owner = access.userId;
            if (!owner) return;

            if (!access.items || access.items.length === 0) {
              // Full vault access
              dirs.push({
                _id: owner.rootDirId,
                name: `${owner.name}'s Drive`,
                type: "directory",
                ownerEmail: owner.email,
                provider: "shared_drive",
                userId: owner._id,
                itemCount: 0,
                size: 0,
              });
            } else {
              // Granular item-level access
              access.items.forEach((item) => {
                const mapped = {
                  _id: item.id,
                  name: item.name,
                  type: item.type,
                  userId: owner._id,
                  provider: item.provider || "local",
                  isShared: true,
                  ownerEmail: owner.email,
                  size: 0,
                };
                if (item.type === "directory") {
                  dirs.push(mapped);
                } else {
                  files.push(mapped);
                }
              });
            }
          });

          const sharedData = {
            directories: dirs,
            files: files,
            parentDir: null,
            parentId: null,
          };
          setData(sharedData);
          setDirName("Shared with me");
          folderCache.current?.set(cacheKey, {
            data: sharedData,
            dirName: "Shared with me",
            dirPath: "Shared",
          });
          setLoading(false);
          return;
        }

        const result = await response.json();
        let directories = [];
        let files = [];
        if (Array.isArray(result)) {
          directories = result.filter((item) => item.type === "directory");
          files = result.filter((item) => item.type !== "directory");
        } else {
          directories = result.directories || [];
          files = result.files || [];
        }

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

        const resolvedData = {
          directories,
          files,
          parentDir: result.parentDir,
          parentId: result.parentId ?? null,
          ownerName: result.ownerName || null,
          ownerEmail: result.ownerEmail || null,
          userId: result.userId || null,
        };
        setData(resolvedData);
        setOwnerName(result.ownerName || null);

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

        const isOtherVault =
          specialView === "owner" ||
          specialView === "admin" ||
          (result.userId && user?._id && result.userId.toString() !== user._id.toString()) ||
          Boolean(ownerId);

        let resolvedName = result.name;
        if (
          result.name === "Vault" &&
          isOtherVault &&
          result.ownerName
        ) {
          resolvedName = `${result.ownerName}'s Vault`;
        } else if (!resolvedName) {
          resolvedName =
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
                            : "Home");
        }
        setDirName(resolvedName);
        folderCache.current?.set(cacheKey, {
          data: resolvedData,
          dirName: resolvedName,
          dirPath: result.path,
          ownerName: result.ownerName || null,
        });
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

  const fetchBranches = async (overrideRepoPath) => {
    if (specialView !== "github-repo") return;
    try {
      const parts = (overrideRepoPath || githubPath || "").split("/");
      if (parts.length < 2) return;
      const repoPath = `${parts[0]}/${parts[1]}`;
      const ownerParam = ownerId ? `?ownerId=${ownerId}` : "";

      const [repoRes, branchRes] = await Promise.all([
        fetch(
          `${SERVER_URL}/github/repositories/${repoPath}${ownerParam}`,
          { credentials: "include" },
        ),
        fetch(
          `${SERVER_URL}/github/repositories/${repoPath}/branches${ownerParam}`,
          { credentials: "include" },
        ),
      ]);

      let defaultBranchName = "";
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        defaultBranchName =
          repoData.details?.default_branch ||
          repoData.default_branch ||
          "";
      }

      if (branchRes.ok) {
        const branchData = await branchRes.json();
        const branchList = Array.isArray(branchData)
          ? branchData
          : branchData.branches || [];
        setBranches(branchList);

        const targetBranch =
          urlBranch || defaultBranchName || (branchList.length > 0 ? branchList[0] : "");
        if (targetBranch) {
          // Pre-populate folderCache for the resolved default branch using the root fetch cache if available
          const emptyBranchKey = `${specialView || "drive"}:${folderId || "root"}:${isSearch ? searchQuery || "" : ""}:${""}:${driveFolderId || ""}:${githubPath || ""}:${ownerId || ""}`;
          const cached = folderCache.current?.get(emptyBranchKey);
          if (cached) {
            const defaultBranchKey = `${specialView || "drive"}:${folderId || "root"}:${isSearch ? searchQuery || "" : ""}:${targetBranch}:${driveFolderId || ""}:${githubPath || ""}:${ownerId || ""}`;
            folderCache.current?.set(defaultBranchKey, cached);
          }
          setSelectedBranch(targetBranch);
        }
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
          setBranches([]);
          lastRepoRef.current = currentRepo;
          fetchBranches(currentRepo);
        }
      }
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

  const handleStarred = async (item) => {
    const type = item.type || (item.extension ? "file" : "directory");
    const provider =
      item.provider ||
      (specialView?.includes("google-drive")
        ? "google_drive"
        : specialView?.includes("github")
        ? "github"
        : "local");
    const metaUrl =
      item.metaUrl ||
      item.webViewLink ||
      item.html_url ||
      item.url ||
      item.download_url ||
      "";

    const rawId = item._id || item.id || item.githubPath;
    const url = `${SERVER_URL}/file/${encodeURIComponent(rawId)}/starred`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        itemId: rawId,
        type,
        provider,
        name: item.name,
        size: item.size || 0,
        mimeType: item.mimeType || "",
        metaUrl,
        githubPath: item.githubPath || "",
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error(resData.error);
    } else {
      setData((prev) => {
        const isStarred = resData.starred;
        if (specialView === "starred" && !isStarred) {
          return {
            directories: prev.directories.filter(
              (i) => i._id !== item._id && i.githubPath !== item.githubPath
            ),
            files: prev.files.filter(
              (i) => i._id !== item._id && i.githubPath !== item.githubPath
            ),
          };
        }
        const updateItem = (i) =>
          i._id === item._id || (i.githubPath && i.githubPath === item.githubPath)
            ? { ...i, isStarred: isStarred, starred: isStarred }
            : i;
        return {
          directories: prev.directories.map(updateItem),
          files: prev.files.map(updateItem),
        };
      });
    }
  };

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
  const [modalType, setModalType] = useState(null); // 'create' | 'create-file' | 'rename' | 'delete-github' | 'delete' | null
  const [modalItem, setModalItem] = useState(null);
  const [modalInput, setModalInput] = useState("");
  const [selectedExt, setSelectedExt] = useState(".txt");
  const [newFileContent, setNewFileContent] = useState("");
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
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
          url = `${SERVER_URL}/github/file/${owner}/${repo}/${path}${selectedBranch ? `?ref=${selectedBranch}` : ""}`;
          body = JSON.stringify({
            content: btoa(".gitkeep"), // Base64 for empty or small text
            message: `Create folder ${modalInput}`,
            ...(selectedBranch && { branch: selectedBranch }),
          });
        } else {
          url = `${SERVER_URL}/directory/${folderId || ""}`;
          body = JSON.stringify({ foldername: modalInput });
        }
      } else if (modalType === "create-file") {
        const rawInput = modalInput.trim();
        const fullName = rawInput.endsWith(selectedExt) ? rawInput : rawInput + selectedExt;
        if (specialView === "github-repo") {
          const p = (githubPath + "/" + fullName).split("/");
          const owner = p[0];
          const repo = p[1];
          const path = p.slice(2).join("/");
          url = `${SERVER_URL}/github/file/${owner}/${repo}/${path}${selectedBranch ? `?ref=${selectedBranch}` : ""}`;
          body = JSON.stringify({
            content: btoa(unescape(encodeURIComponent(newFileContent))),
            message: `Create ${fullName}`,
            ...(selectedBranch && { branch: selectedBranch }),
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
          headers["filesize"] = new Blob([newFileContent]).size.toString();
          body = JSON.stringify({ content: newFileContent });
        }
      } else if (modalType === "rename" && modalItem) {
        if (modalInput === modalItem.name) {
          setModalType(null);
          return;
        }

        if (modalItem.provider === "google_drive") {
          url = `${SERVER_URL}/drive/file/${modalItem._id}`;
          method = "PATCH";
          body = JSON.stringify({ name: modalInput });
        } else if (modalItem.provider === "github") {
          const pathParts = (modalItem.githubPath || "").split("/").filter(Boolean);
          const owner = pathParts[0];
          const repo = pathParts[1];
          const oldRelPath = pathParts.slice(2).join("/");
          const dirPrefix = oldRelPath.includes("/")
            ? oldRelPath.substring(0, oldRelPath.lastIndexOf("/") + 1)
            : "";
          const newRelPath = `${dirPrefix}${modalInput}`;

          url = `${SERVER_URL}/github/repositories/${owner}/${repo}/rename${
            selectedBranch ? `?ref=${encodeURIComponent(selectedBranch)}` : ""
          }`;
          method = "PATCH";
          body = JSON.stringify({
            oldPath: oldRelPath,
            newPath: newRelPath,
            ...(selectedBranch && { branch: selectedBranch }),
          });
        } else {
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
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || result.message || "Operation failed");
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
      if (!isObjectId(dir._id) && dir.name !== "Google Drive") {
        // Direct Google Drive subfolder navigation
        navigate(`/dashboard/google-drive/${dir._id}${ownerParam}`);
      } else {
        // Root Google Drive entry point
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

  const handleGoParent = () => {
    if (folderId || driveFolderId || githubPath) {
      if (specialView === "google-drive-folder") {
        if (!data.parentId || data.parentId === "root") {
          navigate("/dashboard/google-drive");
        } else {
          navigate(`/dashboard/google-drive/${data.parentId}`);
        }
      } else if (specialView === "shared" || specialView === "admin") {
        if (data.parentDir) {
          navigate(`/dashboard/${specialView}/folder/${data.parentDir}`);
        } else {
          navigate("/users");
        }
      } else if (specialView === "github-repo") {
        const parts = (githubPath || "").split("/").filter(Boolean);
        if (parts.length <= 2) {
          navigate("/dashboard/github");
        } else {
          navigate(`/dashboard/github/${parts.slice(0, -1).join("/")}`);
        }
      } else if (data.parentDir === user?.rootDirId || !data.parentDir) {
        navigate("/dashboard");
      } else {
        navigate(`/dashboard/folder/${data.parentDir}`);
      }
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

  const handleDelete = (item) => {
    if (item.provider === "github") {
      setModalItem(item);
      setModalType("delete-github");
      return;
    }

    const isIntegration = item.provider === "google_drive" || (item.provider && item.provider !== "local");
    setModalItem(item);
    setModalType("delete");
    setIsPermanentDelete(isIntegration);
  };

  const handleDeleteConfirm = async () => {
    const itemsToDelete = modalItem ? [modalItem] : selectedItems;
    if (!itemsToDelete || itemsToDelete.length === 0) return;

    try {
      if (itemsToDelete.length === 1 && modalItem) {
        const item = modalItem;
        let url;

        if (item.provider === "google_drive") {
          url = `${SERVER_URL}/drive/file/${item._id}`;
        } else {
          const typeEndpoint = data.directories.find((d) => d._id === item._id)
            ? "directory"
            : "file";
          url = `${SERVER_URL}/${typeEndpoint}/${item._id}`;
        }

        if (ownerId || isPermanentDelete) {
          const params = new URLSearchParams();
          if (ownerId) params.append("ownerId", ownerId);
          if (isPermanentDelete) params.append("permanent", "true");
          url = `${url}?${params.toString()}`;
        }

        const res = await fetch(url, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) {
          const result = await res.json().catch(() => ({}));
          throw new Error(result.error || "Delete failed");
        }
      } else {
        const localItems = itemsToDelete.filter(
          (item) =>
            item.provider !== "google_drive" &&
            item.provider !== "github",
        );
        const externalItems = itemsToDelete.filter(
          (item) =>
            item.provider === "google_drive" ||
            item.provider === "github",
        );

        if (localItems.length > 0) {
          const requestBody = localItems.map((item) => {
            const type = data.directories.some((d) => d._id === item._id)
              ? "directory"
              : "file";
            return { _id: item._id, id: item._id, type };
          });

          const params = new URLSearchParams();
          if (ownerId) params.append("ownerId", ownerId);
          if (isPermanentDelete) params.append("permanent", "true");
          const queryStr = params.toString() ? `?${params.toString()}` : "";

          const res = await fetch(
            `${SERVER_URL}/directory/delete-batch${queryStr}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
              credentials: "include",
            },
          );

          if (!res.ok) {
            const errResult = await res.json().catch(() => ({}));
            throw new Error(errResult.error || "Batch delete failed");
          }
        }

        if (externalItems.length > 0) {
          const deletePromises = externalItems.map((item) => {
            const ownerParam = ownerId ? `?ownerId=${ownerId}` : "";
            if (item.provider === "google_drive") {
              return fetch(
                `${SERVER_URL}/drive/file/${item._id}${ownerParam}`,
                {
                  method: "DELETE",
                  credentials: "include",
                },
              );
            } else {
              return fetch(
                `${SERVER_URL}/github/file/${item.githubPath}${ownerParam}`,
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sha: item.sha }),
                  credentials: "include",
                },
              );
            }
          });
          await Promise.all(deletePromises);
        }
      }

      fetchFiles();
      setModalType(null);
      setModalItem(null);
      setSelectedItems([]);
      setIsPermanentDelete(false);
    } catch (err) {
      console.error("Delete failed", err);
      alert(err.message || "Failed to delete item(s)");
    }
  };

  const allCurrentItems = [...(data?.directories || []), ...(data?.files || [])];

  useFileKeyboardNavigation({
    items: allCurrentItems,
    selectedItems,
    setSelectedItems,
    onNavigate: handleNavigate,
    onPreview: handlePreview,
    onDelete: () => {
      if (selectedItems.length > 0) {
        setModalItem(null);
        setModalType("delete");
        setIsPermanentDelete(false);
      }
    },
    onRename: (item) => {
      setModalItem(item);
      setModalInput(item.name);
      setModalType("rename");
    },
    onStar: handleStarred,
    onDownload: handleDownload,
    onParentNavigate: handleGoParent,
    viewMode,
    isReadOnly,
    containerRef,
  });

  const confirmDeleteGithub = async () => {
    if (!modalItem) return;

    try {
      const isDirectory = modalItem.type === "directory";
      let url = isDirectory
        ? `${SERVER_URL}/github/repositories/${modalItem.githubPath}${selectedBranch ? `?ref=${selectedBranch}` : ""}`
        : `${SERVER_URL}/github/file/${modalItem.githubPath}${selectedBranch ? `?ref=${selectedBranch}` : ""}`;

      if (ownerId) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}ownerId=${ownerId}`;
      }

      const body = isDirectory
        ? undefined
        : JSON.stringify({ sha: modalItem.sha, ...(selectedBranch && { branch: selectedBranch }) });

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

  const [activeDraggedIds, setActiveDraggedIds] = useState([]);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);

  const handleDragStart = (e, item) => {
    if (isSpecialFolder(item, specialView)) {
      e.preventDefault();
      return;
    }
    let itemsToDrag = [item];
    if (selectedItems.some((i) => i._id === item._id)) {
      itemsToDrag = selectedItems.filter((i) => !isSpecialFolder(i, specialView));
    }
    if (itemsToDrag.length === 0) {
      e.preventDefault();
      return;
    }

    // Ensure type is present for all
    const preparedItems = itemsToDrag.map((i) => ({
      ...i,
      type: i.type || (i.extension ? "file" : "directory"),
    }));

    setActiveDraggedIds(preparedItems.map((i) => i._id));
    e.dataTransfer.setData("draggedItems", JSON.stringify(preparedItems));
    e.dataTransfer.setData("draggedItem", JSON.stringify(preparedItems[0]));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setActiveDraggedIds([]);
    setDragOverTargetId(null);
  };

  const handleDragOver = (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (
      targetItem &&
      (targetItem.type === "directory" ||
        targetItem.provider === "shared_drive" ||
        targetItem.provider === "google_drive" ||
        targetItem.provider === "github") &&
      !activeDraggedIds.includes(targetItem._id)
    ) {
      if (dragOverTargetId !== targetItem._id) {
        setDragOverTargetId(targetItem._id);
      }
    }
  };

  const handleDragLeave = (e, targetItem) => {
    if (targetItem && !e.currentTarget.contains(e.relatedTarget)) {
      if (dragOverTargetId === targetItem._id) {
        setDragOverTargetId(null);
      }
    }
  };

  const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);
    setActiveDraggedIds([]);
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

    // Filter out special folders - they are permanently fixed and not movable
    itemsToMove = itemsToMove.filter((i) => !isSpecialFolder(i, specialView));

    if (itemsToMove.length > 0) {
      // Normalize targetItem: if it's a file, treat it as dropped into its parent directory
      let finalTargetItem = targetItem;
      if (targetItem && (targetItem.type === "file" || targetItem.extension)) {
        const targetParentDir =
          targetItem.parentDir?._id || targetItem.parentDir;
        finalTargetItem = {
          _id: targetParentDir || folderId || user?.rootDirId,
          provider: targetItem.provider || "local",
        };
      }

      const targetId = finalTargetItem?._id || finalTargetItem?.id;
      const targetProvider = finalTargetItem?.provider || "local";

      const normalizeDirId = (id) => {
        if (!id || id === "root" || id === "undefined" || id === "null") {
          return user?.rootDirId?.toString() || "root";
        }
        if (typeof id === "object" && id._id) {
          return id._id.toString();
        }
        return id.toString();
      };

      // Filter out same-directory moves
      const isSameDirectory = itemsToMove.every((item) => {
        const itemParent = item.parentDir?._id || item.parentDir;
        return normalizeDirId(itemParent) === normalizeDirId(targetId);
      });

      if (isSameDirectory) {
        return;
      }

      // Filter out if target is one of the moved items (can't move folder into itself)
      if (targetId && itemsToMove.some((i) => (i._id || i.id) === targetId)) return;

      const sourceProviders = new Set(
        itemsToMove.map((i) => i.provider || "local"),
      );
      const ownerParam = ownerId ? `?ownerId=${ownerId}` : "";

      // 1. Internal Moves (Same Provider)
      if (sourceProviders.size === 1 && sourceProviders.has(targetProvider)) {
        if (targetProvider === "github" && finalTargetItem.githubPath) {
          try {
            await fetch(`${SERVER_URL}/github/move${ownerParam}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: itemsToMove,
                targetPath: finalTargetItem.githubPath,
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
          let driveTargetId = targetId;
          if (isObjectId(driveTargetId)) driveTargetId = "root";

          try {
            await fetch(`${SERVER_URL}/drive/move${ownerParam}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: itemsToMove.map((i) => i._id || i.id),
                targetId: driveTargetId,
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
            const payload = itemsToMove.map((item) => ({
              _id: item._id || item.id,
              type: item.type,
            }));
            const destId = (targetId && targetId !== user?.rootDirId) ? targetId : "";
            const moveUrl = destId
              ? `${SERVER_URL}/directory/${destId}/move${ownerParam}`
              : `${SERVER_URL}/directory/move${ownerParam}`;
            await fetch(moveUrl, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              credentials: "include",
            });
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
        let targetFolderId = targetId;
        if (!targetFolderId || targetFolderId === "root")
          targetFolderId = user?.rootDirId;

        try {
          await fetch(`${SERVER_URL}/drive/transfer-to-vault${ownerParam}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: itemsToMove
                .filter((i) => i.provider === "google_drive")
                .map((i) => ({
                  _id: i._id || i.id,
                  name: i.name,
                  mimeType: i.mimeType || "application/octet-stream",
                  type: i.type,
                })),
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
        let targetDriveFolderId = targetId;
        if (!targetDriveFolderId || isObjectId(targetDriveFolderId))
          targetDriveFolderId = "root";

        try {
          const localItems = itemsToMove
            .filter((i) => !i.provider || i.provider === "local");
          const res = await fetch(`${SERVER_URL}/drive/transfer-from-vault${ownerParam}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: localItems.map((i) => ({
                _id: i._id || i.id,
                name: i.name,
                extension: i.extension,
                size: i.size,
                type: i.type,
              })),
              targetDriveFolderId: targetDriveFolderId,
            }),
            credentials: "include",
          });
          if (res.ok && localItems.length > 0) {
            await batchDelete(
              localItems.map((i) => ({
                _id: i._id || i.id,
                type: i.type || (i.extension ? "file" : "directory"),
              }))
            ).catch(() => {});
          }
          fetchFiles();
          setSelectedItems([]);
        } catch (err) {
          console.error("Transfer from Vault failed", err);
        }
        return;
      }

      // Vault -> GitHub
      if ((sourceProviders.has("local") || sourceProviders.has("google_drive")) && targetProvider === "github") {
        const destGithubPath = finalTargetItem?.githubPath || githubPath;
        if (!destGithubPath) {
          alert("Please open a GitHub repository and folder before moving files.");
          return;
        }

        try {
          const localItems = itemsToMove.filter(
            (i) => !i.provider || i.provider === "local",
          );
          if (localItems.length > 0) {
            const res = await fetch(`${SERVER_URL}/github/transfer-from-vault${ownerParam}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: localItems.map((i) => ({
                  _id: i._id || i.id,
                  name: i.name,
                  extension: i.extension,
                  size: i.size,
                  type: i.type,
                })),
                targetPath: destGithubPath,
              }),
              credentials: "include",
            });
            if (res.ok) {
              await batchDelete(
                localItems.map((i) => ({
                  _id: i._id || i.id,
                  type: i.type || (i.extension ? "file" : "directory"),
                }))
              ).catch(() => {});
            }
            fetchFiles();
            setSelectedItems([]);
          }
        } catch (err) {
          console.error("Transfer to GitHub failed", err);
        }
        return;
      }

      return;
    }

    // Handle Desktop Upload SECOND
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      let targetDirId = folderId; // default to current vault folder

      const targetId = targetItem?._id || targetItem?.id;
      if (targetId) {
        const itemProvider = targetItem?.provider || "local";
        if (itemProvider === "github" && targetItem.githubPath) {
          targetDirId = `github:${targetItem.githubPath}`;
        } else if (itemProvider === "google_drive") {
          targetDirId = isObjectId(targetId)
            ? `drive:root`
            : `drive:${targetId}`;
        } else {
          targetDirId = targetId;
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
        target = { _id: driveFolderId || "root", provider: "google_drive" };
      } else if (specialView === "github-repo") {
        target = { githubPath: githubPath, provider: "github" };
      } else {
        target = { _id: folderId || user?.rootDirId };
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

  const breadcrumbs = getBreadcrumbs();

  if (specialView === "shared" && !folderId) {
    return (
      <div className="flex-1 flex flex-col relative">
        <PlanStatusBanner />
        <SecureRelayView openShareModal={openShareModal} />
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col relative"
      onDrop={handleZoneDrop}
      onDragOver={handleZoneDragOver}
    >
      <PlanStatusBanner />
      <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 pb-4 mb-4 border-b border-white/5 shrink-0 px-1 sm:px-2">
        <div className="flex items-center gap-2 min-w-0 max-w-full flex-wrap">
          {(data.parentDir ||
            (specialView === "shared" && folderId) ||
            specialView === "admin" ||
            specialView === "owner" ||
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
                } else if (specialView === "admin" || specialView === "owner") {
                  if (data.parentDir) {
                    navigate(`/dashboard/${specialView}/folder/${data.parentDir}`);
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
                } else if (data.parentDir === user?.rootDirId) {
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
                  handleDrop(e, { id: user?.rootDirId });
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
              className="p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-200 dark:border-white/10 mr-2 shadow-sm"
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
          <div className="flex items-center flex-wrap gap-1 text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight min-w-0">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={idx} className="flex items-center gap-1">
                  {idx > 0 && (
                    <span className="text-slate-300 dark:text-white/20 select-none font-light mx-0.5">
                      /
                    </span>
                  )}
                  {isLast ? (
                    <span className="text-slate-900 dark:text-white font-black capitalize truncate max-w-[150px] sm:max-w-[280px] select-none">
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      onClick={() => navigate(crumb.path)}
                      className="text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white capitalize transition-all duration-200 select-none hover:underline underline-offset-4"
                    >
                      {crumb.label}
                    </button>
                  )}
                </div>
              );
            })}
            {folderId && data.parentDir && !isSearch && !isReadOnly && (
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
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-all ml-1 shrink-0"
                title="Rename Folder"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>

          {specialView === "github-repo" && branches.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 dark:bg-white/[0.05] backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
              <GitBranch size={14} className="text-accent-primary shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
              >
                {branches.map((branch) => (
                  <option
                    key={branch}
                    value={branch}
                    className="dark:bg-[#1a1a1c] text-slate-900 dark:text-white font-mono"
                  >
                    {branch}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {specialView === "github" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setClonePreselectedRepo(null);
                  setShowCloneModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                title="Clone any GitHub repository into your Vault storage"
              >
                <FolderGit2 size={15} />
                <span>Clone to Vault</span>
              </button>
              <button
                onClick={() => {
                  setModalInput("");
                  setIsPrivate(false);
                  setModalType("create-repo");
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-primary text-accent-foreground font-bold shadow-accent-glow hover:opacity-90 text-xs active:scale-95 transition-all cursor-pointer"
                title="Create New GitHub Repository"
              >
                <Plus size={15} />
                <span>New Repository</span>
              </button>
            </div>
          )}

          {specialView === "github-repo" && (
            <button
              onClick={() => {
                setClonePreselectedRepo({ owner: githubOwner, name: githubRepo, default_branch: selectedBranch });
                setShowCloneModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              title="Clone this repository into your Vault storage"
            >
              <FolderGit2 size={15} />
              <span>Clone to Vault</span>
            </button>
          )}

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

      {/* ── GIT REPOSITORY WORKSPACE TABS ── */}
      {specialView === "github-repo" && (
        <div className="flex items-center gap-1.5 p-1 bg-white/40 dark:bg-[#111113]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl mb-4 overflow-x-auto custom-scrollbar">
          {[
            { id: "files", label: "Files", icon: Folder, count: data.files.length + data.directories.length },
            { id: "commits", label: "Commits", icon: GitCommit },
            { id: "branches", label: "Branches", icon: GitBranch, count: branches.length },
            { id: "pulls", label: "Pull Requests", icon: GitPullRequest },
            { id: "releases", label: "Releases", icon: Tag },
            { id: "actions", label: "Actions CI/CD", icon: Workflow },
            { id: "operations", label: "Git Ops", icon: SlidersHorizontal },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeGitTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleGitTabChange(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                  isActive
                    ? "bg-accent-soft text-accent-primary border border-accent-border shadow-sm"
                    : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
                }`}
              >
                <Icon size={14} className={isActive ? "text-accent-primary" : "text-slate-400"} />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-accent-primary text-accent-foreground" : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/70"
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
          {specialView === "google-drive" ||
          specialView === "google-drive-folder" ||
          (typeof error === "string" &&
            (error.toLowerCase().includes("invalid_grant") ||
              error.toLowerCase().includes("drive") ||
              error.toLowerCase().includes("token") ||
              error.toLowerCase().includes("expired") ||
              error.toLowerCase().includes("not connected"))) ? (
            <>
              <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                <VaultDriveIcon size={38} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                Google Drive Authorization Expired
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                {error?.includes("invalid_grant") || error?.includes("expired")
                  ? "Your Google Drive session has expired or the token was revoked (Google OAuth refresh tokens expire after 7 days in testing mode). Reconnect your Google account to restore instant access."
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
                  {reconnectingDrive ? "Connecting..." : "Reconnect Google Drive"}
                </Button>
                <Button
                  onClick={() => fetchFiles(true)}
                  className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-white px-5 py-2.5"
                >
                  Retry Connection
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                Connection Error
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {error}
              </p>
              <Button
                onClick={() => fetchFiles(true)}
                className="bg-[#14b8a6] hover:bg-[#14b8a6]/90 text-white px-8"
              >
                Retry Connection
              </Button>
            </>
          )}
          <p className="mt-6 text-xs text-slate-400">
            Current Server:{" "}
            <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
              {SERVER_URL}
            </code>
          </p>
        </div>
      ) : specialView === "github-repo" && activeGitTab !== "files" ? (
        <div className="flex-1 pb-16">
          {activeGitTab === "commits" && (
            <GitCommitHistoryView
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              branches={branches}
              onBranchChange={handleBranchChange}
              onRefreshRepo={() => fetchFiles(true)}
            />
          )}
          {activeGitTab === "branches" && (
            <GitBranchManager
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              onBranchSelect={handleBranchChange}
              onRefreshRepo={() => fetchFiles(true)}
            />
          )}
          {activeGitTab === "pulls" && (
            <GitPullRequestsView
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              branches={branches}
              onRefreshRepo={() => fetchFiles(true)}
            />
          )}
          {activeGitTab === "releases" && (
            <GitReleasesView
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              onRefreshRepo={() => fetchFiles(true)}
            />
          )}
          {activeGitTab === "actions" && (
            <GitActionsWorkflowView
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              onRefreshRepo={() => fetchFiles(true)}
            />
          )}
          {activeGitTab === "operations" && (
            <GitOperationsPanel
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              branches={branches}
              onRefreshRepo={() => fetchFiles(true)}
            />
          )}
        </div>
      ) : loading ? (
        <FileBrowserSkeleton viewMode={viewMode} count={12} />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* ── GIT WORKSPACE LIVE WORKING TREE BAR ── */}
          {isGitWorkspace && (
            <GitWorkspaceBar
              folderId={folderId}
              workspaceId={data.gitWorkspace?.workspaceId}
              gitWorkspaceMeta={data.gitWorkspace}
              onOpenStaging={() => setShowStagingModal(true)}
              onOpenStash={() => setShowStashDrawer(true)}
              onRefresh={() => fetchFiles(true)}
            />
          )}

          <div
            data-tour="file-grid"
            className={`pb-20 relative select-none flex-1 content-start ${
              viewMode === "list"
                ? "flex flex-col gap-1"
                : "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-6 p-3 sm:p-6 rounded-2xl sm:rounded-[2.5rem] vault-glass-panel"
            }`}
            onMouseDown={handleMouseDown}
          >
            {viewMode === "list" && (
              <div className="grid grid-cols-[1fr,40px] sm:grid-cols-[1fr,100px,40px] md:grid-cols-[1fr,100px,150px,40px] gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-500 border-b border-slate-200/50 dark:border-slate-800/50 mb-2 items-center sticky top-0 bg-transparent z-10">
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

            {data.directories.map((dir) => (
              <AssetCard
                id={`file-card-${dir._id}`}
                key={dir._id}
                item={dir}
                specialView={specialView}
                selected={selectedItems.some((i) => i._id === dir._id)}
                onSelect={(item, e) => handleSelect(item, e)}
                onNavigate={handleNavigate}
                onStarred={handleStarred}
                onRename={handleRenameClick}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onPreview={handlePreview}
                onDetails={(item) => setDetailsItem(item)}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, dir)}
                onDragLeave={(e) => handleDragLeave(e, dir)}
                onDrop={handleDrop}
                viewMode={viewMode}
                readOnly={isReadOnly}
                onCopy={handleCopyItem}
                onCut={handleCutItem}
                isCut={
                  clipboard &&
                  clipboard.action === "cut" &&
                  clipboard.items.some((i) => i._id === dir._id)
                }
                isBeingDragged={activeDraggedIds.includes(dir._id)}
                isDragOver={dragOverTargetId === dir._id}
                isIntegrationRoot={
                  (!specialView &&
                    (dir.provider === "google_drive" ||
                      dir.provider === "github")) ||
                  (specialView === "github" && dir.provider === "github")
                }
                onShare={openShareModal}
                onViewHistory={(item) => setFileForHistory(item)}
                onConfigureBackup={(item) => {
                  setBackupTargetDirectory(item);
                  setShowBackupModal(true);
                }}
                onCloneToVault={(item) => {
                  setClonePreselectedRepo(item);
                  setShowCloneModal(true);
                }}
              />
            ))}
            {data.files.map((file) => (
              <AssetCard
                id={`file-card-${file._id}`}
                key={file._id}
                item={file}
                specialView={specialView}
                selected={selectedItems.some((i) => i._id === file._id)}
                onSelect={(item, e) => handleSelect(item, e)}
                onNavigate={() => {}} // Files don't navigate
                onStarred={handleStarred}
              onRename={handleRenameClick}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onPreview={handlePreview}
              onDetails={(item) => {
                setDetailsItem(item);
                if (!item.provider || item.provider === "local") {
                  fetch(`${SERVER_URL}/file/${item._id}/opened`, {
                    method: "POST",
                    credentials: "include",
                  }).catch(() => {});
                }
              }}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, file)}
              onDragLeave={(e) => handleDragLeave(e, file)}
              onDrop={handleDrop}
              viewMode={viewMode}
              readOnly={isReadOnly}
              onCopy={handleCopyItem}
              onCut={handleCutItem}
              isCut={
                clipboard &&
                clipboard.action === "cut" &&
                clipboard.items.some((i) => i._id === file._id)
              }
              isBeingDragged={activeDraggedIds.includes(file._id)}
              isDragOver={dragOverTargetId === file._id}
              onShare={openShareModal}
              onViewHistory={(item) => setFileForHistory(item)}
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
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedItems.length > 0 && !isReadOnly && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar bg-white/90 dark:bg-vault-surface/90 backdrop-blur-2xl text-slate-900 dark:text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/[0.08] flex items-center gap-3 sm:gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <span className="font-medium text-sm">
            {selectedItems.length} selected
          </span>
          {selectedItems.some((i) => !isSpecialFolder(i, specialView)) && (
            <>
              <div className="h-4 w-px bg-slate-700"></div>
              <button
                onClick={handleCopySelected}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition-colors font-medium text-sm"
                title="Bulk Copy"
              >
                <Copy size={16} /> Copy
              </button>
              <button
                onClick={handleCutSelected}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition-colors font-medium text-sm"
                title="Bulk Move"
              >
                <Scissors size={16} /> Move
              </button>
            </>
          )}
          <div className="h-4 w-px bg-slate-700"></div>
          <button
            onClick={() => {
              openShareModal(selectedItems);
              setSelectedItems([]);
            }}
            className="flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white transition-colors font-medium text-sm"
            title="Bulk Share"
          >
            <Share2 size={16} className="text-purple-400" /> Share
          </button>
          {selectedItems.some((i) => !isSpecialFolder(i, specialView)) && (
            <>
              <div className="h-4 w-px bg-slate-700"></div>
              <button
                onClick={() => {
                  const deletable = selectedItems.filter((i) => !isSpecialFolder(i, specialView));
                  if (deletable.length === 1) {
                    handleDelete(deletable[0]);
                  } else if (deletable.length > 1) {
                    const isIntegrationBatch =
                      specialView?.includes("google-drive") ||
                      specialView?.includes("github") ||
                      deletable.every((i) => i.provider && i.provider !== "local");
                    setModalItem(null);
                    setIsPermanentDelete(isIntegrationBatch);
                    setModalType("delete");
                  }
                }}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors font-medium text-sm"
              >
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
        </div>
      )}

      <FileOperationModals
        modalType={modalType}
        setModalType={setModalType}
        modalItem={modalItem}
        setModalItem={setModalItem}
        modalInput={modalInput}
        setModalInput={setModalInput}
        selectedExt={selectedExt}
        setSelectedExt={setSelectedExt}
        newFileContent={newFileContent}
        setNewFileContent={setNewFileContent}
        isPermanentDelete={isPermanentDelete}
        setIsPermanentDelete={setIsPermanentDelete}
        isCreateFullscreen={isCreateFullscreen}
        createModalRef={createModalRef}
        toggleCreateFullscreen={toggleCreateFullscreen}
        handleModalSubmit={handleModalSubmit}
        handleDeleteConfirm={handleDeleteConfirm}
        confirmDeleteGithub={confirmDeleteGithub}
        isPrivate={isPrivate}
        setIsPrivate={setIsPrivate}
        selectedCount={selectedItems.length}
        specialView={specialView}
      />

      {/* New Vault OS Details Modal */}
      {detailsItem && (
        <FileDetailsModal
          item={detailsItem}
          onClose={() => setDetailsItem(null)}
        />
      )}

      <Suspense fallback={<FilePreviewSkeleton type="modal-shell" />}>
        {!!previewFile && (
          <FilePreviewModal
            file={previewFile}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
            ownerId={ownerId}
            selectedBranch={selectedBranch}
            onViewHistory={(file) => {
              setPreviewFile(null);
              setFileForHistory(file);
            }}
          />
        )}
      </Suspense>

      {/* ── GIT FILE HISTORY & 1-CLICK RESTORE MODAL ── */}
      {fileForHistory && (
        <GitFileHistoryModal
          isOpen={!!fileForHistory}
          onClose={() => setFileForHistory(null)}
          owner={githubOwner || fileForHistory?.githubPath?.split("/")[0]}
          repo={githubRepo || fileForHistory?.githubPath?.split("/")[1]}
          filePath={
            fileForHistory?.githubPath
              ? fileForHistory.githubPath.split("/").slice(2).join("/")
              : fileForHistory?.name
          }
          selectedBranch={selectedBranch}
          onFileRestored={() => fetchFiles(true)}
        />
      )}

      {/* ── GIT STAGING & MULTI-FILE ATOMIC COMMIT WORKBENCH ── */}
      <GitStagingWorkbenchModal
        isOpen={showStagingModal}
        onClose={() => setShowStagingModal(false)}
        folderId={folderId}
        workspaceId={data.gitWorkspace?.workspaceId}
        onCommitted={() => fetchFiles(true)}
      />

      {/* ── GIT STASH SNAPSHOTS DRAWER ── */}
      <GitStashDrawer
        isOpen={showStashDrawer}
        onClose={() => setShowStashDrawer(false)}
        workspaceId={data.gitWorkspace?.workspaceId}
        onStashUpdated={() => fetchFiles(true)}
      />

      {/* ── AUTOMATED FOLDER BACKUP CONFIGURATION MODAL ── */}
      <GitFolderBackupModal
        isOpen={showBackupModal}
        onClose={() => {
          setShowBackupModal(false);
          setBackupTargetDirectory(null);
        }}
        directory={backupTargetDirectory}
        onSyncCompleted={() => fetchFiles(true)}
      />

      {/* ── 1-CLICK CLONE REPO TO VAULT MODAL ── */}
      <GitCloneRepoModal
        isOpen={showCloneModal}
        onClose={() => {
          setShowCloneModal(false);
          setClonePreselectedRepo(null);
        }}
        preselectedRepo={clonePreselectedRepo}
        destinationFolderId={folderId}
        onCloned={() => fetchFiles(true)}
      />

      {/* Floating Clipboard Bar */}
      {clipboard && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar bg-[#111113]/95 border border-vault-emerald/30 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_15px_rgba(0,212,165,0.1)] rounded-full text-xs sm:text-sm backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-white/60 font-medium whitespace-nowrap">
            {clipboard.action === "cut" ? "Cut" : "Copied"}{" "}
            <strong className="text-white">{clipboard.items.length}</strong>{" "}
            {clipboard.items.length === 1 ? "item" : "items"}
          </span>
          <div className="h-4 w-[1px] bg-white/10" />
          <button
            onClick={handlePaste}
            className="text-vault-emerald hover:text-vault-emerald/80 font-bold transition-all px-2.5 py-1 rounded-lg hover:bg-vault-emerald/10 flex items-center gap-1.5"
          >
            <Clipboard size={14} /> Paste
          </button>
          <button
            onClick={() => updateClipboard(null)}
            className="text-white/40 hover:text-white/80 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
