import { useState, useEffect } from "react";
import { getRepoBranches, createBranch, deleteBranch, compareBranches } from "../../api/github.api";
import GitDiffViewer from "./GitDiffViewer";
import GitSafetyModal from "./GitSafetyModal";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import {
  GitBranch,
  Plus,
  Trash2,
  GitCompare,
  Check,
  Search,
  Loader2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";

export default function GitBranchManager({
  owner,
  repo,
  selectedBranch,
  onBranchSelect,
  onRefreshRepo,
}) {
  const [branches, setBranches] = useState([]);
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create branch state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [fromRef, setFromRef] = useState(selectedBranch || "main");
  const [creating, setCreating] = useState(false);

  // Delete branch state
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Compare branches state
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareBase, setCompareBase] = useState("main");
  const [compareHead, setCompareHead] = useState(selectedBranch || "main");
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRepoBranches(owner, repo);
      const detailed = res.detailedBranches || [];
      setBranches(detailed);
      setDefaultBranch(res.defaultBranch || "main");
      if (!compareBase) setCompareBase(res.defaultBranch || "main");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [owner, repo]);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setCreating(true);
    try {
      const res = await createBranch(owner, repo, {
        branchName: newBranchName.trim(),
        fromRef: fromRef || selectedBranch || defaultBranch,
      });
      alert(res.message || "Branch created successfully");
      setShowCreateModal(false);
      setNewBranchName("");
      await fetchBranches();
      if (onBranchSelect) onBranchSelect(newBranchName.trim());
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Failed to create branch");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBranchConfirm = async () => {
    if (!branchToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteBranch(owner, repo, branchToDelete.name);
      alert(res.message || "Branch deleted successfully");
      setBranchToDelete(null);
      await fetchBranches();
      if (selectedBranch === branchToDelete.name && onBranchSelect) {
        onBranchSelect(defaultBranch);
      }
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Failed to delete branch");
    } finally {
      setDeleting(false);
    }
  };

  const runCompare = async () => {
    if (!compareBase || !compareHead) return;
    setComparing(true);
    try {
      const res = await compareBranches(owner, repo, compareBase, compareHead);
      setCompareResult(res);
    } catch (err) {
      alert(err.message || "Branch comparison failed");
      setCompareResult(null);
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    if (showCompareModal && compareBase && compareHead) {
      runCompare();
    }
  }, [showCompareModal, compareBase, compareHead]);

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/60 dark:bg-[#111113]/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-soft text-accent-primary border border-accent-border">
            <GitBranch size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Branches</span>
              <span className="text-xs text-slate-500 dark:text-white/40 font-normal">
                ({branches.length})
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
              Create, switch, delete, and compare branches with complete Git safety.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setCompareBase(defaultBranch);
              setCompareHead(selectedBranch || defaultBranch);
              setShowCompareModal(true);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <GitCompare size={14} /> Compare
          </Button>

          <Button
            onClick={() => {
              setFromRef(selectedBranch || defaultBranch);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-accent-primary text-accent-foreground shadow-accent-glow"
          >
            <Plus size={14} /> New Branch
          </Button>
        </div>
      </div>

      {/* Search Field */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter branches..."
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-accent-primary font-medium shadow-sm"
        />
      </div>

      {/* Branch List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-accent-primary mx-auto mb-3" />
          <p className="text-sm font-medium">Fetching repository branches...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredBranches.map((branch) => {
            const isCurrent = branch.name === selectedBranch;
            const isDefault = branch.isDefault || branch.name === defaultBranch;

            return (
              <div
                key={branch.name}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? "bg-accent-soft/30 dark:bg-accent-soft/20 border-accent-primary ring-2 ring-accent-primary/40 shadow-md"
                    : "bg-white dark:bg-[#111113] border-slate-200/90 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GitBranch
                      size={16}
                      className={isCurrent ? "text-accent-primary shrink-0" : "text-slate-400 shrink-0"}
                    />
                    <span className="font-bold text-sm text-slate-900 dark:text-white font-mono truncate">
                      {branch.name}
                    </span>
                    {isDefault && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold shrink-0">
                        Default
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-accent-soft text-accent-primary border border-accent-border font-bold shrink-0 flex items-center gap-1">
                        <Check size={10} /> Active
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isCurrent && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onBranchSelect && onBranchSelect(branch.name)}
                        className="text-xs px-2.5 py-1"
                      >
                        Switch
                      </Button>
                    )}
                    {!isDefault && (
                      <button
                        onClick={() => setBranchToDelete(branch)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete branch"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {branch.sha && (
                  <div className="text-[11px] font-mono text-slate-500 dark:text-white/40 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                    <span>HEAD:</span>
                    <span className="text-slate-700 dark:text-white/70 font-bold">
                      {branch.sha.substring(0, 7)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE BRANCH MODAL ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Branch"
        className="max-w-md"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
              Branch Name
            </label>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="e.g. feature/payment-gateway"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:border-accent-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
              Source (Branch or Commit SHA)
            </label>
            <input
              type="text"
              value={fromRef}
              onChange={(e) => setFromRef(e.target.value)}
              placeholder="e.g. main or 7a8b9c0"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:border-accent-primary"
            />
            <p className="text-[11px] text-slate-500 dark:text-white/40 mt-1">
              Defaults to current branch <strong className="text-accent-primary">{selectedBranch || defaultBranch}</strong>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newBranchName.trim() || creating} className="bg-accent-primary text-accent-foreground shadow-accent-glow">
              {creating ? "Creating..." : "Create Branch"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE BRANCH CONFIRMATION (RED SAFETY) ── */}
      {branchToDelete && (
        <GitSafetyModal
          isOpen={true}
          onClose={() => setBranchToDelete(null)}
          onConfirm={handleDeleteBranchConfirm}
          severity="red"
          title={`Delete Branch '${branchToDelete.name}'`}
          description={`DANGER — You are about to permanently delete the remote branch '${branchToDelete.name}'. Any unmerged commits exclusive to this branch will be lost.`}
          requireInputText={branchToDelete.name}
          impactDetails={[
            `Branch pointer '${branchToDelete.name}' will be permanently deleted from GitHub`,
            `Cannot be undone unless you recreate the branch with the exact previous SHA (${branchToDelete.sha?.substring(0, 7)})`,
          ]}
          confirmText="Permanently Delete Branch"
          loading={deleting}
        />
      )}

      {/* ── COMPARE BRANCHES MODAL ── */}
      <Modal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title={
          <div className="flex items-center gap-2">
            <GitCompare size={18} className="text-accent-primary" />
            <span>Compare Branches</span>
          </div>
        }
        className="max-w-4xl"
      >
        <div className="space-y-6 pt-1">
          {/* Branch Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 mb-1.5">
                Base Branch (Target)
              </label>
              <select
                value={compareBase}
                onChange={(e) => setCompareBase(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-accent-primary"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} {b.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 mb-1.5">
                Head Branch (Source with Changes)
              </label>
              <select
                value={compareHead}
                onChange={(e) => setCompareHead(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-accent-primary"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Compare Results */}
          {comparing ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 size={32} className="animate-spin text-accent-primary mx-auto mb-2" />
              <p className="text-xs font-mono">Comparing branches and calculating diffs...</p>
            </div>
          ) : compareResult ? (
            <div className="space-y-4">
              {/* Metrics Header */}
              <div className="flex items-center justify-between p-4 bg-accent-soft/20 border border-accent-border rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white">
                    {compareHead} is {compareResult.ahead_by} commit(s) ahead of {compareBase}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">{compareResult.files?.length || 0} changed files</span>
                </div>
              </div>

              {/* Diffs */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {compareResult.files?.map((file, idx) => (
                  <GitDiffViewer
                    key={file.filename || idx}
                    filename={file.filename}
                    patch={file.patch}
                    status={file.status}
                    additions={file.additions}
                    deletions={file.deletions}
                    defaultExpanded={idx === 0 || compareResult.files.length <= 3}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              Select branches above to compare changes.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
