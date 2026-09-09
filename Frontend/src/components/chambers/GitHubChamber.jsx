import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams, Link, useOutletContext } from "react-router-dom";
import { SERVER_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { usePlan } from "../../context/PlanContext";
import { useChamberTransfer } from "../../context/ChamberTransferContext";
import { cn, formatSize } from "../../lib/utils";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import AssetCard from "../dashboard/AssetCard";
import FileDetailsModal from "../dashboard/FileDetailsModal";
import FileBrowserSkeleton from "../drive/FileBrowserSkeleton";
import EmptyState from "../drive/EmptyState";
import { VaultGitIcon } from "../ui/VaultIcons";
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Tag,
  Workflow,
  SlidersHorizontal,
  FolderGit2,
  Plus,
  Unlink,
  ChevronRight,
  Folder,
  LayoutGrid,
  List,
  Search,
  Lock,
  Globe,
  Loader2,
  Trash2,
  Clipboard,
  Share2,
} from "lucide-react";

import GitCommitHistoryView from "../git/GitCommitHistoryView";
import GitBranchManager from "../git/GitBranchManager";
import GitPullRequestsView from "../git/GitPullRequestsView";
import GitOperationsPanel from "../git/GitOperationsPanel";
import GitFileHistoryModal from "../git/GitFileHistoryModal";
import GitBranchDropdown from "../git/GitBranchDropdown";
import GitCloneRepoModal from "../git/GitCloneRepoModal";
import GitReleasesView from "../git/GitReleasesView";
import GitActionsWorkflowView from "../git/GitActionsWorkflowView";
import { toggleStar, recordItemOpened } from "../../api/files.api";

// Lazy-load Preview Modal
const FilePreviewModal = lazy(() => import("../drive/FilePreviewModal"));

export default function GitHubChamber() {
  const params = useParams();
  const githubPath = params["*"] || "";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeGitTab = searchParams.get("tab") || "files";
  const urlBranch = searchParams.get("ref");
  const searchQuery = searchParams.get("q") || "";

  const { user, setUser } = useAuth();
  const { hasFeature } = usePlan();
  const {
    clipboard,
    copyItems,
    cutItems,
    clearClipboard,
  } = useChamberTransfer();

  const isRepoView = Boolean(githubPath.trim());
  const pathSegments = githubPath.split("/").filter(Boolean);
  const githubOwner = pathSegments[0] || "";
  const githubRepo = pathSegments[1] || "";
  const githubSubPath = pathSegments.slice(2).join("/");

  const [data, setData] = useState({ directories: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(urlBranch || "");
  const [selectedItems, setSelectedItems] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [fileForHistory, setFileForHistory] = useState(null);

  // Modals
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [clonePreselectedRepo, setClonePreselectedRepo] = useState(null);
  const [modalType, setModalType] = useState(null); // 'create-repo', 'create-branch'
  const [modalInput, setModalInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Switch git tab
  const handleGitTabChange = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    setSearchParams(nextParams);
  };

  // Smart back navigation: parent subfolder if inside repo, or GitHub chamber if at repo root
  const handleGoBack = () => {
    if (pathSegments.length > 2) {
      const parentPath = pathSegments.slice(0, -1).join("/");
      navigate(`/dashboard/github/${parentPath}`);
    } else {
      navigate("/dashboard/github");
    }
  };

  const { openShareModal, downloadFile } = useOutletContext() || {};
  const [detailsItem, setDetailsItem] = useState(null);
  const [lastSelectedId, setLastSelectedId] = useState(null);

  // Toggle Star
  const handleToggleStar = async (item) => {
    try {
      const isFolder = item.type === "directory";
      const owner = item.owner || githubOwner;
      const repo = item.repo || githubRepo;
      const ghPath = item.githubPath || (owner && repo ? `${owner}/${repo}` : item.name);
      const rawId = item._id || item.id || ghPath;

      const res = await toggleStar(rawId, {
        itemId: rawId,
        type: isFolder ? "directory" : "file",
        provider: "github",
        name: item.name,
        size: item.size || 0,
        mimeType: item.mimeType || "",
        metaUrl: item.html_url || item.url || "",
        githubPath: ghPath,
      });

      setData((prev) => {
        const isStarred = res.starred;
        const targetId = rawId;
        const updateItem = (i) =>
          (i._id === targetId || i.id === targetId || i.githubPath === ghPath)
            ? { ...i, isStarred, starred: isStarred }
            : i;
        return {
          directories: prev.directories.map(updateItem),
          files: prev.files.map(updateItem),
        };
      });
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  // Download Repo, Folder, or File
  const handleDownload = (item) => {
    if (!item) return;
    const isFolder = item.type === "directory";
    const parts = (item.githubPath || "").split("/").filter(Boolean);
    const owner = parts[0] || githubOwner;
    const repo = parts[1] || githubRepo;
    const queryParams = selectedBranch ? `?ref=${encodeURIComponent(selectedBranch)}` : "";
    let url = "";

    if (isFolder) {
      if (parts.length <= 2) {
        url = `${SERVER_URL}/github/repositories/${owner}/${repo}/download${queryParams}`;
      } else {
        const sub = parts.slice(2).join("/");
        url = `${SERVER_URL}/github/repositories/${owner}/${repo}/folder-download/${sub}${queryParams}`;
      }
    } else {
      url = `${SERVER_URL}/github/file/${item.githubPath}?action=download${queryParams.replace("?", "&")}`;
    }

    const downloadName = isFolder ? `${item.name}.zip` : item.name;
    if (downloadFile) {
      downloadFile(url, downloadName);
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Selection Handler
  const handleSelect = (item, e) => {
    const itemId = item._id || item.id || item.githubPath;
    if (e && e.shiftKey && lastSelectedId) {
      const all = [...data.directories, ...data.files];
      const lastIdx = all.findIndex((i) => (i._id || i.id || i.githubPath) === lastSelectedId);
      const currIdx = all.findIndex((i) => (i._id || i.id || i.githubPath) === itemId);
      if (lastIdx !== -1 && currIdx !== -1) {
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        const range = all.slice(start, end + 1);
        setSelectedItems((prev) => {
          const set = new Set(prev.map((i) => i._id || i.id || i.githubPath));
          const added = range.filter((i) => !set.has(i._id || i.id || i.githubPath));
          return [...prev, ...added];
        });
        setLastSelectedId(itemId);
        return;
      }
    }

    if (e && (e.ctrlKey || e.metaKey)) {
      setLastSelectedId(itemId);
      setSelectedItems((prev) =>
        prev.some((i) => (i._id || i.id || i.githubPath) === itemId)
          ? prev.filter((i) => (i._id || i.id || i.githubPath) !== itemId)
          : [...prev, item]
      );
    } else {
      setLastSelectedId(itemId);
      setSelectedItems([item]);
    }
  };

  // File Preview with recent activity logging
  const handleFilePreview = (file) => {
    setPreviewFile(file);
    if (file) {
      recordItemOpened({
        itemId: file.githubPath || file._id || file.name,
        provider: "github",
        name: file.name,
        type: "file",
        size: file.size || 0,
        githubPath: file.githubPath || "",
      }).catch(() => {});
    }
  };

  // Branch change
  const handleBranchChange = (branch) => {
    setSelectedBranch(branch);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("ref", branch);
    setSearchParams(nextParams);
  };

  // Disconnect GitHub
  const disconnectGithub = async () => {
    if (!window.confirm("Are you sure you want to disconnect your GitHub account?")) return;
    try {
      const res = await fetch(`${SERVER_URL}/github/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok && user) {
        const newUser = { ...user };
        if (newUser.integrations?.github) {
          newUser.integrations.github.connected = false;
          setUser(newUser);
        }
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Github disconnect error:", err);
      alert("Failed to disconnect GitHub");
    }
  };

  // Fetch branches when in repo view
  const fetchBranches = async () => {
    if (!githubOwner || !githubRepo) return;
    try {
      const repoPath = `${githubOwner}/${githubRepo}`;
      const [repoRes, branchRes] = await Promise.all([
        fetch(`${SERVER_URL}/github/repositories/${repoPath}`, { credentials: "include" }),
        fetch(`${SERVER_URL}/github/repositories/${repoPath}/branches`, { credentials: "include" }),
      ]);

      let defaultBranchName = "";
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        defaultBranchName = repoData.details?.default_branch || repoData.default_branch || "";
      }

      if (branchRes.ok) {
        const branchData = await branchRes.json();
        const branchList = Array.isArray(branchData) ? branchData : branchData.branches || [];
        setBranches(branchList);
        if (!selectedBranch) {
          const target = urlBranch || defaultBranchName || (branchList.length > 0 ? branchList[0] : "");
          setSelectedBranch(target);
        }
      }
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  // Fetch repository contents or repositories list
  const fetchContents = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      let url = "";
      if (!isRepoView) {
        // Root list of repositories
        url = `${SERVER_URL}/github/repositories`;
      } else {
        // Inside repository
        const contentPath = githubSubPath ? `/${githubSubPath}` : "";
        const branchQuery = selectedBranch ? `?ref=${encodeURIComponent(selectedBranch)}` : "";

        if (searchQuery) {
          url = `${SERVER_URL}/github/repositories/${githubOwner}/${githubRepo}/search?q=${encodeURIComponent(searchQuery)}${githubSubPath ? `&path=${encodeURIComponent(githubSubPath)}` : ""}${selectedBranch ? `&ref=${encodeURIComponent(selectedBranch)}` : ""}`;
        } else {
          url = `${SERVER_URL}/github/repositories/${githubOwner}/${githubRepo}/contents${contentPath}${branchQuery}`;
        }
      }

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to load GitHub contents");
      }

      const result = await res.json();
      let directories = [];
      let files = [];

      if (!isRepoView) {
        // Mapping repos as directory items
        const repos = Array.isArray(result)
          ? result
          : (result.directories || result.repositories || []);

        directories = repos.map((repo) => {
          const owner =
            repo.owner?.login ||
            repo.owner ||
            (repo.githubPath ? repo.githubPath.split("/")[0] : githubOwner);
          const githubPath =
            repo.githubPath ||
            (owner ? `${owner}/${repo.name}` : repo.name);

          return {
            ...repo,
            _id: repo.id || repo._id || repo.name,
            name: repo.name,
            type: "directory",
            provider: "github",
            owner,
            description: repo.description || "",
            isPrivate: repo.private !== undefined ? repo.private : Boolean(repo.isPrivate),
            stars: repo.stargazers_count ?? repo.stars ?? 0,
            updatedAt: repo.updated_at || repo.updatedAt,
            defaultBranch: repo.default_branch || repo.defaultBranch,
            githubPath,
          };
        });
      } else {
        if (Array.isArray(result)) {
          directories = result.filter((item) => item.type === "directory" || item.type === "dir");
          files = result.filter((item) => item.type !== "directory" && item.type !== "dir");
        } else {
          directories = result.directories || [];
          files = result.files || [];
        }

        // Tag items with provider github and appropriate path
        directories = directories.map((d) => ({
          ...d,
          type: "directory",
          provider: "github",
          githubPath: d.path ? `${githubOwner}/${githubRepo}/${d.path}` : `${githubOwner}/${githubRepo}/${d.name}`,
        }));

        files = files.map((f) => ({
          ...f,
          type: "file",
          provider: "github",
          githubPath: f.path ? `${githubOwner}/${githubRepo}/${f.path}` : `${githubOwner}/${githubRepo}/${f.name}`,
        }));
      }

      setData({ directories, files });

      if (isRepoView && githubOwner && githubRepo) {
        const isSub = Boolean(githubSubPath);
        const openedPath = isSub ? `${githubOwner}/${githubRepo}/${githubSubPath}` : `${githubOwner}/${githubRepo}`;
        const openedName = isSub ? githubSubPath.split("/").pop() : githubRepo;
        recordItemOpened({
          itemId: openedPath,
          provider: "github",
          name: openedName,
          type: "directory",
          githubPath: openedPath,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Error fetching GitHub data:", err);
      setError(err.message || "Failed to communicate with GitHub API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRepoView) {
      fetchBranches();
    }
  }, [githubOwner, githubRepo]);

  useEffect(() => {
    fetchContents();
    setSelectedItems([]);
  }, [githubPath, selectedBranch, searchQuery]);

  // Listen for global refresh
  useEffect(() => {
    const handleRefresh = () => fetchContents(true);
    window.addEventListener("vault:refresh", handleRefresh);
    return () => window.removeEventListener("vault:refresh", handleRefresh);
  }, [githubPath, selectedBranch, searchQuery]);

  // Create repository
  const handleCreateRepo = async () => {
    if (!modalInput.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${SERVER_URL}/github/repositories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modalInput.trim(),
          private: isPrivate,
          auto_init: true,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create repository");
      }
      setModalType(null);
      setModalInput("");
      fetchContents(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  // Paste from clipboard into GitHub repo
  const handlePasteIntoRepo = async () => {
    if (!clipboard || !clipboard.items || clipboard.items.length === 0) return;
    if (!isRepoView) {
      alert("Please open a GitHub repository before pasting files.");
      return;
    }

    const destPath = `${githubOwner}/${githubRepo}${githubSubPath ? `/${githubSubPath}` : ""}`;
    const localItems = clipboard.items.filter((i) => !i.provider || i.provider === "local");

    if (localItems.length > 0) {
      try {
        const res = await fetch(`${SERVER_URL}/github/transfer-from-vault`, {
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
            targetPath: destPath,
          }),
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to transfer files to GitHub");
        }

        clearClipboard();
        fetchContents(true);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Build breadcrumbs
  const breadcrumbList = [{ name: "GitHub", path: "/dashboard/github" }];
  if (githubOwner && githubRepo) {
    breadcrumbList.push({
      name: `${githubOwner}/${githubRepo}`,
      path: `/dashboard/github/${githubOwner}/${githubRepo}`,
    });
    const subParts = githubSubPath.split("/").filter(Boolean);
    let accum = `${githubOwner}/${githubRepo}`;
    subParts.forEach((part) => {
      accum += `/${part}`;
      breadcrumbList.push({
        name: part,
        path: `/dashboard/github/${accum}`,
      });
    });
  }

  const allItems = [...data.directories, ...data.files];

  return (
    <div className="flex-1 min-w-0 w-full flex flex-col relative">
      {/* ── CHAMBER HEADER TOOLBAR ── */}
      <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-white/5">
        {/* Breadcrumb Navigation & Branch Dropdown */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Smart Back Button: hidden on GitHub chamber root, navigates up to parent or chamber */}
          {isRepoView && (
            <button
              onClick={handleGoBack}
              className="p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all border border-slate-200 dark:border-white/10 mr-1 shadow-sm shrink-0 active:scale-95 cursor-pointer"
              title={pathSegments.length > 2 ? "Go to Parent Folder" : "Back to GitHub Repositories"}
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <Link
            to="/dashboard/github"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-soft hover:bg-accent-soft/80 border border-accent-border hover:border-accent-border/60 text-accent-primary font-bold text-sm transition-all duration-150 cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Return to GitHub Repositories"
          >
            <VaultGitIcon size={18} />
            <span>GitHub</span>
          </Link>

          {breadcrumbList.slice(1).map((b, idx) => (
            <div key={b.path} className="flex items-center gap-1 text-sm font-medium">
              <ChevronRight size={14} className="text-slate-400" />
              <Link
                to={b.path}
                className="text-slate-600 dark:text-white/70 hover:text-accent-primary transition-colors truncate max-w-[160px]"
              >
                {b.name}
              </Link>
            </div>
          ))}

          {/* Branch Dropdown inside repo */}
          {isRepoView && branches.length > 0 && (
            <div className="ml-2">
              <GitBranchDropdown
                branches={branches}
                selectedBranch={selectedBranch}
                onSelectBranch={handleBranchChange}
              />
            </div>
          )}

          {searchQuery && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-xs font-mono text-slate-300">
              <Search size={12} />
              <span>"{searchQuery}"</span>
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            onClick={() => {
              if (selectedItems.length > 0) {
                openShareModal?.(selectedItems);
              } else if (isRepoView) {
                openShareModal?.([
                  {
                    _id: `${githubOwner}/${githubRepo}`,
                    name: `${githubOwner}/${githubRepo}`,
                    type: "directory",
                    provider: "github",
                    githubPath: `${githubOwner}/${githubRepo}`,
                    metaUrl: `https://github.com/${githubOwner}/${githubRepo}`,
                  },
                ]);
              } else {
                openShareModal?.([
                  {
                    _id: "github-chamber",
                    name: "GitHub Chamber",
                    type: "chamber",
                    provider: "github",
                    metaUrl: "https://github.com",
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
                : isRepoView
                ? "Share Repo"
                : "Share Chamber"}
            </span>
          </Button>

          {!isRepoView ? (
            <>
              <Button
                onClick={() => {
                  setClonePreselectedRepo(null);
                  setShowCloneModal(true);
                }}
                variant="outline"
                className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold border-accent-border hover:bg-accent-soft text-slate-700 dark:text-white"
                title="Clone any repository into your Vault storage"
              >
                <FolderGit2 size={15} className="text-accent-primary" />
                <span>Clone to Vault</span>
              </Button>

              <Button
                onClick={() => {
                  setModalInput("");
                  setIsPrivate(false);
                  setModalType("create-repo");
                }}
                className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold bg-accent-primary hover:opacity-90 text-accent-foreground shadow-md shadow-accent-glow/20"
              >
                <Plus size={15} />
                <span>New Repository</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setClonePreselectedRepo({
                  owner: githubOwner,
                  name: githubRepo,
                  default_branch: selectedBranch,
                });
                setShowCloneModal(true);
              }}
              className="px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold bg-accent-primary text-accent-foreground shadow-md shadow-accent-glow hover:opacity-90"
            >
              <FolderGit2 size={15} />
              <span>Clone to Vault</span>
            </Button>
          )}

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

          {/* Disconnect GitHub Button */}
          <button
            onClick={disconnectGithub}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all"
            title="Disconnect GitHub integration"
          >
            <Unlink size={14} />
            <span className="hidden md:inline">Disconnect</span>
          </button>
        </div>
      </div>

      {/* ── GIT REPO WORKSPACE TABS (WHEN INSIDE REPO) ── */}
      {isRepoView && (
        <div className="shrink-0 flex items-center gap-1.5 p-1.5 bg-white/40 dark:bg-[#111113]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl mb-4 overflow-x-auto custom-scrollbar">
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
                    ? "bg-accent-soft text-accent-primary border border-accent-border shadow-accent-glow-sm"
                    : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5"
                }`}
              >
                <Icon size={14} className={isActive ? "text-accent-primary" : "text-slate-400"} />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-accent-primary text-accent-foreground shadow-[0_0_8px_var(--accent-glow)]"
                        : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/70"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── TAB PANELS ── */}
      {isRepoView && activeGitTab !== "files" ? (
        <div className="flex-1 pb-16">
          {activeGitTab === "commits" && (
            <GitCommitHistoryView
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              branches={branches}
              onBranchChange={handleBranchChange}
              onRefreshRepo={() => fetchContents(true)}
            />
          )}
          {activeGitTab === "branches" && (
            <GitBranchManager
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              onBranchSelect={handleBranchChange}
              onRefreshRepo={() => fetchContents(true)}
            />
          )}
          {activeGitTab === "pulls" && (
            <GitPullRequestsView
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              branches={branches}
              onRefreshRepo={() => fetchContents(true)}
            />
          )}
          {activeGitTab === "releases" && (
            <GitReleasesView
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              onRefreshRepo={() => fetchContents(true)}
            />
          )}
          {activeGitTab === "actions" && (
            <GitActionsWorkflowView
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              onRefreshRepo={() => fetchContents(true)}
            />
          )}
          {activeGitTab === "operations" && (
            <GitOperationsPanel
              owner={githubOwner}
              repo={githubRepo}
              selectedBranch={selectedBranch}
              branches={branches}
              onRefreshRepo={() => fetchContents(true)}
            />
          )}
        </div>
      ) : loading ? (
        <FileBrowserSkeleton viewMode={viewMode} />
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <VaultGitIcon size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">GitHub Error</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{error}</p>
          <Button onClick={() => fetchContents()} variant="outline" className="px-6 py-2 text-sm">
            Retry Connection
          </Button>
        </div>
      ) : allItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-accent-soft border border-accent-border rounded-2xl flex items-center justify-center text-accent-primary mb-4 shadow-lg shadow-accent-glow/20">
            <VaultGitIcon size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1.5">
            {!isRepoView ? "No repositories found" : "This folder is empty"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 max-w-sm mb-6 leading-relaxed">
            {!isRepoView
              ? "Create a new repository or clone one from GitHub to get started."
              : "No files or directories found in this repository branch."}
          </p>
          {!isRepoView ? (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setModalInput("");
                  setIsPrivate(false);
                  setModalType("create-repo");
                }}
                className="px-4 py-2 text-xs font-bold bg-accent-primary hover:opacity-90 text-accent-foreground shadow-md shadow-accent-glow flex items-center gap-2"
              >
                <Plus size={15} />
                <span>New Repository</span>
              </Button>
              <Button
                onClick={() => {
                  setClonePreselectedRepo(null);
                  setShowCloneModal(true);
                }}
                variant="outline"
                className="px-4 py-2 text-xs font-bold border-slate-200 dark:border-white/10 hover:bg-white/5 text-slate-700 dark:text-white flex items-center gap-2"
              >
                <FolderGit2 size={15} className="text-accent-primary" />
                <span>Clone to Vault</span>
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex-1 pb-16 px-1 pt-2 sm:px-2">
          {/* Directories / Repositories */}
          {data.directories.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h4 className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-4 sm:mb-5">
                {!isRepoView ? `Repositories (${data.directories.length})` : `Folders (${data.directories.length})`}
              </h4>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 p-1.5 sm:p-2"
                    : "flex flex-col gap-2 p-1 sm:p-2"
                }
              >
                {data.directories.map((dir) => {
                  const targetUrl = !isRepoView
                    ? `/dashboard/github/${dir.githubPath}`
                    : `/dashboard/github/${dir.githubPath}${selectedBranch ? `?ref=${selectedBranch}` : ""}`;

                  return (
                    <AssetCard
                      key={dir._id}
                      item={dir}
                      viewMode={viewMode}
                      specialView={!isRepoView ? "github" : "github-repo"}
                      selected={selectedItems.some((i) => (i._id || i.githubPath) === (dir._id || dir.githubPath))}
                      onSelect={handleSelect}
                      onNavigate={() => navigate(targetUrl)}
                      onPreview={() => navigate(targetUrl)}
                      onStarred={handleToggleStar}
                      onShare={(item) => (openShareModal ? openShareModal([item]) : null)}
                      onDownload={handleDownload}
                      onDetails={(item) => setDetailsItem(item)}
                      onCopy={(item) => copyItems([item], "github")}
                      onCut={(item) => cutItems([item], "github")}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Files */}
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
                    specialView="github-repo"
                    selected={selectedItems.some((i) => (i._id || i.githubPath) === (file._id || file.githubPath))}
                    onSelect={handleSelect}
                    onPreview={handleFilePreview}
                    onStarred={handleToggleStar}
                    onShare={(item) => (openShareModal ? openShareModal([item]) : null)}
                    onDownload={handleDownload}
                    onDetails={(item) => setDetailsItem(item)}
                    onViewHistory={(item) => setFileForHistory(item)}
                    onCopy={(item) => copyItems([item], "github")}
                    onCut={(item) => cutItems([item], "github")}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE REPO MODAL ── */}
      <Modal
        isOpen={modalType === "create-repo"}
        onClose={() => {
          setModalType(null);
          setModalInput("");
        }}
        title="Create New GitHub Repository"
        className="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateRepo();
          }}
          className="space-y-4 text-slate-900 dark:text-white"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-white/60 uppercase tracking-wider mb-2">
              Repository Name
            </label>
            <input
              type="text"
              value={modalInput}
              onChange={(e) => setModalInput(e.target.value)}
              placeholder="e.g. awesome-project"
              autoFocus
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-slate-300 text-accent-primary focus:ring-accent-primary"
            />
            <label htmlFor="isPrivate" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
              {isPrivate ? <Lock size={14} className="text-amber-400" /> : <Globe size={14} className="text-emerald-400" />}
              <span>Make this repository private</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalType(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !modalInput.trim()}
              className="bg-accent-primary hover:opacity-90 text-accent-foreground font-bold shadow-md shadow-accent-glow"
            >
              {isSubmitting ? "Creating..." : "Create Repository"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── CLONE REPO TO VAULT MODAL ── */}
      <GitCloneRepoModal
        isOpen={showCloneModal}
        onClose={() => {
          setShowCloneModal(false);
          setClonePreselectedRepo(null);
        }}
        preselectedRepo={clonePreselectedRepo}
        onCloned={() => {
          alert("Repository cloned to Vault successfully!");
        }}
      />

      {/* ── GIT FILE HISTORY MODAL ── */}
      {fileForHistory && (
        <GitFileHistoryModal
          isOpen={Boolean(fileForHistory)}
          onClose={() => setFileForHistory(null)}
          owner={githubOwner}
          repo={githubRepo}
          filePath={fileForHistory.path || fileForHistory.name}
          selectedBranch={selectedBranch}
          onFileRestored={() => fetchContents(true)}
        />
      )}

      {/* ── FILE PREVIEW MODAL ── */}
      {previewFile && (
        <Suspense fallback={null}>
          <FilePreviewModal
            file={previewFile}
            isOpen={Boolean(previewFile)}
            onClose={() => setPreviewFile(null)}
            selectedBranch={selectedBranch}
            onViewHistory={(file) => {
              setPreviewFile(null);
              setFileForHistory(file);
            }}
          />
        </Suspense>
      )}

      {/* ── FLOATING CLIPBOARD BAR (PASTE SUPPORT) ── */}
      {clipboard && isRepoView && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar bg-[#111113]/95 border border-accent-border/40 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_15px_var(--accent-glow)] rounded-full text-xs sm:text-sm backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-white/60 font-medium whitespace-nowrap">
            {clipboard.action === "cut" ? "Cut" : "Copied"}{" "}
            <strong className="text-white">{clipboard.items.length}</strong>{" "}
            {clipboard.items.length === 1 ? "item" : "items"}
          </span>
          <div className="h-4 w-[1px] bg-white/10" />
          <button
            onClick={handlePasteIntoRepo}
            className="text-accent-primary hover:opacity-80 font-bold transition-all px-2.5 py-1 rounded-lg hover:bg-accent-soft flex items-center gap-1.5"
          >
            <Clipboard size={14} /> Paste into Repo
          </button>
          <button
            onClick={() => clearClipboard()}
            className="text-white/40 hover:text-white/80 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── FILE DETAILS MODAL ── */}
      {detailsItem && (
        <FileDetailsModal
          item={detailsItem}
          isOpen={Boolean(detailsItem)}
          onClose={() => setDetailsItem(null)}
        />
      )}
    </div>
  );
}
