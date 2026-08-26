import { useState, useEffect } from "react";
import {
  GitBranch,
  GitCommit,
  ArrowDownCircle,
  ArrowUpCircle,
  Archive,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Plus,
} from "lucide-react";
import {
  getWorkspaceStatus,
  pullRemoteChanges,
  switchWorkspaceBranch,
} from "../../api/gitWorkspace.api";
import { getRepoBranches, createBranch } from "../../api/github.api";
import GitBranchDropdown from "./GitBranchDropdown";
import Button from "../ui/Button";

export default function GitWorkspaceBar({
  workspaceId,
  folderId,
  gitWorkspaceMeta = {},
  onOpenStaging,
  onOpenStash,
  onRefresh,
  onStatusLoaded,
}) {
  const safeMeta = gitWorkspaceMeta || {};
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(safeMeta.branch || "main");
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const repoOwner = safeMeta.repoOwner || statusData?.workspace?.repoOwner;
  const repoName = safeMeta.repoName || statusData?.workspace?.repoName;
  const resolvedWorkspaceId = workspaceId || safeMeta.workspaceId || statusData?.workspace?._id;

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getWorkspaceStatus({
        ...(resolvedWorkspaceId && { workspaceId: resolvedWorkspaceId }),
        ...(folderId && { folderId }),
      });
      setStatusData(res);
      if (onStatusLoaded) {
        onStatusLoaded(res);
      }
      if (res.workspace?.branch) {
        setSelectedBranch(res.workspace.branch);
      }
      const ownerToUse = res.workspace?.repoOwner || repoOwner;
      const repoToUse = res.workspace?.repoName || repoName;
      if (ownerToUse && repoToUse) {
        getRepoBranches(ownerToUse, repoToUse)
          .then((bRes) => setBranches(bRes.branches || []))
          .catch(() => {});
      }
    } catch (err) {
      console.error("Error fetching workspace status:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    const ownerToUse = repoOwner || statusData?.workspace?.repoOwner;
    const repoToUse = repoName || statusData?.workspace?.repoName;
    if (!ownerToUse || !repoToUse) return;
    try {
      const res = await getRepoBranches(ownerToUse, repoToUse);
      setBranches(res.branches || []);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBranches();
  }, [workspaceId, folderId, repoOwner, repoName]);

  const handlePull = async () => {
    if (!resolvedWorkspaceId && !folderId) return;
    try {
      setPulling(true);
      const res = await pullRemoteChanges({
        workspaceId: resolvedWorkspaceId,
        folderId,
      });
      alert(res.message || "Pull completed successfully");
      fetchStatus();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to pull remote changes");
    } finally {
      setPulling(false);
    }
  };

  const handleBranchChange = async (targetBranch) => {
    if (!targetBranch || targetBranch === selectedBranch) return;
    if (!resolvedWorkspaceId && !folderId) return;
    if (
      statusData &&
      (statusData.untracked.length > 0 || statusData.modified.length > 0)
    ) {
      const confirmSwitch = window.confirm(
        "You have uncommitted changes in your workspace. It is recommended to stash or commit them before switching branches. Proceed anyway?"
      );
      if (!confirmSwitch) return;
    }

    try {
      setSwitchingBranch(true);
      await switchWorkspaceBranch({
        workspaceId: resolvedWorkspaceId,
        folderId,
        targetBranch,
      });
      setSelectedBranch(targetBranch);
      fetchStatus();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to switch branch");
    } finally {
      setSwitchingBranch(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim() || (!resolvedWorkspaceId && !folderId)) return;

    try {
      setSwitchingBranch(true);
      await switchWorkspaceBranch({
        workspaceId: resolvedWorkspaceId,
        folderId,
        targetBranch: newBranchName.trim(),
        createNew: true,
      });
      setSelectedBranch(newBranchName.trim());
      setShowNewBranchModal(false);
      setNewBranchName("");
      fetchBranches();
      fetchStatus();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || "Failed to create new branch");
    } finally {
      setSwitchingBranch(false);
    }
  };

  const dirtyCount =
    (statusData?.untracked?.length || 0) + (statusData?.modified?.length || 0);
  const stagedCount = statusData?.staged?.length || 0;

  return (
    <div className="bg-gradient-to-r from-accent-soft/40 via-vault-surface/60 to-accent-soft/20 border border-accent-border rounded-3xl p-4 mb-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Workspace Title & Repo Link */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent-primary flex items-center justify-center border border-accent-border shadow-inner">
            <FolderGit2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-primary border border-accent-border">
                Git Workspace
              </span>
              {repoOwner && repoName && (
                <a
                  href={`https://github.com/${repoOwner}/${repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-accent-primary flex items-center gap-1 transition-colors"
                >
                  <span>{repoOwner}/{repoName}</span>
                  <ExternalLink size={12} className="opacity-60" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Live Git working tree & bi-directional sync active in Vault
            </p>
          </div>
        </div>

        {/* Center: Polished Custom Branch Dropdown & Sync Pulse */}
        <div className="flex items-center gap-3 bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-2xl">
          <GitBranchDropdown
            branches={branches}
            selectedBranch={selectedBranch}
            onSelectBranch={handleBranchChange}
            onOpenNewBranchModal={() => setShowNewBranchModal(true)}
            disabled={switchingBranch}
          />

          {/* Ahead / Behind Pills */}
          {statusData && (
            <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-slate-200 dark:border-white/10 text-[11px] font-mono">
              {statusData.behindBy > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md" title={`${statusData.behindBy} commits behind remote`}>
                  <ArrowDownCircle size={12} />
                  {statusData.behindBy}
                </span>
              )}
              {statusData.aheadBy > 0 && (
                <span className="flex items-center gap-0.5 text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md" title={`${statusData.aheadBy} commits ahead of remote`}>
                  <ArrowUpCircle size={12} />
                  {statusData.aheadBy}
                </span>
              )}
              {statusData.behindBy === 0 && statusData.aheadBy === 0 && (
                <span className="flex items-center gap-0.5 text-accent-primary" title="Synchronized with remote HEAD">
                  <CheckCircle2 size={13} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Working Tree Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Pull Button */}
          <button
            onClick={handlePull}
            disabled={pulling}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Fetch and pull remote changes into Vault workspace"
          >
            <RefreshCw size={13} className={pulling ? "animate-spin text-accent-primary" : ""} />
            <span>{pulling ? "Pulling..." : "Pull"}</span>
          </button>

          {/* Stash Drawer Trigger */}
          <button
            onClick={onOpenStash}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 transition-all active:scale-95 cursor-pointer"
            title="Open Stash snapshots drawer"
          >
            <Archive size={13} className="text-amber-400" />
            <span>Stash</span>
          </button>

          {/* Staging & Multi-File Commit Workbench */}
          <button
            onClick={onOpenStaging}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-xl bg-accent-primary text-accent-foreground shadow-lg shadow-accent-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            title="Open Staging Workbench and multi-file commit tool"
          >
            <GitCommit size={14} />
            <span>Commit & Push</span>
            {(dirtyCount > 0 || stagedCount > 0) && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 dark:bg-white/20 text-accent-foreground text-[10px] font-mono">
                {stagedCount > 0 ? `${stagedCount} staged` : `${dirtyCount} changed`}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* New Branch Modal */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <GitBranch className="text-accent-primary" size={20} />
              <span>Create New Branch</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Create and check out a new branch based on current branch <strong>{selectedBranch}</strong>.
            </p>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/vault-integration"
                  className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-accent-primary"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={!newBranchName.trim() || switchingBranch}
                  className="bg-accent-primary text-accent-foreground px-5 py-2 text-xs font-bold shadow-md shadow-accent-glow"
                >
                  {switchingBranch ? "Creating..." : "Create & Checkout"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
