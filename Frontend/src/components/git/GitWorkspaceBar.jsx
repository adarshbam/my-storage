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
import Button from "../ui/Button";

export default function GitWorkspaceBar({
  workspaceId,
  folderId,
  gitWorkspaceMeta = {},
  onOpenStaging,
  onOpenStash,
  onRefresh,
}) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(gitWorkspaceMeta.branch || "main");
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const repoOwner = gitWorkspaceMeta.repoOwner || statusData?.workspace?.repoOwner;
  const repoName = gitWorkspaceMeta.repoName || statusData?.workspace?.repoName;
  const resolvedWorkspaceId = workspaceId || gitWorkspaceMeta.workspaceId || statusData?.workspace?._id;

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getWorkspaceStatus({
        ...(resolvedWorkspaceId && { workspaceId: resolvedWorkspaceId }),
        ...(folderId && { folderId }),
      });
      setStatusData(res);
      if (res.workspace?.branch) {
        setSelectedBranch(res.workspace.branch);
      }
    } catch (err) {
      console.error("Error fetching workspace status:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!repoOwner || !repoName) return;
    try {
      const res = await getRepoBranches(repoOwner, repoName);
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
    if (!resolvedWorkspaceId) return;
    try {
      setPulling(true);
      const res = await pullRemoteChanges({ workspaceId: resolvedWorkspaceId });
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
    if (!targetBranch || targetBranch === selectedBranch || !resolvedWorkspaceId) return;
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
    if (!newBranchName.trim() || !resolvedWorkspaceId) return;

    try {
      setSwitchingBranch(true);
      await switchWorkspaceBranch({
        workspaceId: resolvedWorkspaceId,
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
    <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-950/40 dark:via-[#111827]/60 dark:to-cyan-950/30 border border-emerald-500/20 dark:border-emerald-500/30 rounded-3xl p-4 mb-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Workspace Title & Repo Link */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
            <FolderGit2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Git Workspace
              </span>
              {repoOwner && repoName && (
                <a
                  href={`https://github.com/${repoOwner}/${repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-400 flex items-center gap-1 transition-colors"
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

        {/* Center: Branch Selector & Sync Pulse */}
        <div className="flex items-center gap-2 bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-2xl">
          <GitBranch size={15} className="text-emerald-400 shrink-0" />
          <select
            value={selectedBranch}
            onChange={(e) => {
              if (e.target.value === "__create_new__") {
                setShowNewBranchModal(true);
              } else {
                handleBranchChange(e.target.value);
              }
            }}
            disabled={switchingBranch}
            className="bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
          >
            {branches.map((b) => (
              <option key={b} value={b} className="dark:bg-[#18181b] text-slate-900 dark:text-white">
                {b}
              </option>
            ))}
            <option value="__create_new__" className="text-emerald-400 font-bold dark:bg-[#18181b]">
              + New Branch...
            </option>
          </select>

          {/* Ahead / Behind Pills */}
          {statusData && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200 dark:border-white/10 text-[11px] font-mono">
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
                <span className="flex items-center gap-0.5 text-emerald-400" title="Synchronized with remote HEAD">
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Fetch and pull remote changes into Vault workspace"
          >
            <RefreshCw size={13} className={pulling ? "animate-spin text-emerald-400" : ""} />
            <span>{pulling ? "Pulling..." : "Pull"}</span>
          </button>

          {/* Stash Drawer Trigger */}
          <button
            onClick={onOpenStash}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 transition-all active:scale-95 cursor-pointer"
            title="Open Stash snapshots drawer"
          >
            <Archive size={13} className="text-amber-400" />
            <span>Stash</span>
          </button>

          {/* Staging & Multi-File Commit Workbench */}
          <button
            onClick={onOpenStaging}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            title="Open Staging Workbench and multi-file commit tool"
          >
            <GitCommit size={14} />
            <span>Commit & Push</span>
            {(dirtyCount > 0 || stagedCount > 0) && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-mono">
                {stagedCount > 0 ? `${stagedCount} staged` : `${dirtyCount} changed`}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* New Branch Modal */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <GitBranch className="text-emerald-400" size={20} />
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
                  className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={!newBranchName.trim() || switchingBranch}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-emerald-500/20"
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
