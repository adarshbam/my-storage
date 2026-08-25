import { useState, useEffect } from "react";
import { getCommits, getCommitDetails, revertCommit, cherryPickCommit, resetBranch } from "../../api/github.api";
import GitDiffViewer from "./GitDiffViewer";
import GitSafetyModal from "./GitSafetyModal";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import {
  GitCommit,
  Clock,
  User,
  Copy,
  Check,
  RotateCcw,
  GitBranch,
  ShieldCheck,
  Search,
  Loader2,
  ExternalLink,
  ChevronRight,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function GitCommitHistoryView({
  owner,
  repo,
  selectedBranch,
  branches = [],
  onBranchChange,
  onRefreshRepo,
}) {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Selected Commit Inspector
  const [selectedCommitSha, setSelectedCommitSha] = useState(null);
  const [commitDetails, setCommitDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copiedSha, setCopiedSha] = useState(null);

  // Safety modal states
  const [safetyAction, setSafetyAction] = useState(null); // 'revert' | 'cherry-pick' | 'reset'
  const [actionCommit, setActionCommit] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetMode, setResetMode] = useState("mixed");
  const [targetBranchForCherryPick, setTargetBranchForCherryPick] = useState(selectedBranch);

  const fetchCommits = async (isNewSearch = false) => {
    setLoading(true);
    setError(null);
    try {
      const currentPage = isNewSearch ? 1 : page;
      const res = await getCommits(owner, repo, {
        ref: selectedBranch,
        per_page: 30,
        page: currentPage,
      });

      const newCommits = res.commits || [];
      if (isNewSearch) {
        setCommits(newCommits);
        setPage(1);
      } else {
        setCommits((prev) => (currentPage === 1 ? newCommits : [...prev, ...newCommits]));
      }
      setHasMore(newCommits.length === 30);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load commit history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommits(true);
  }, [owner, repo, selectedBranch]);

  const loadCommitDetails = async (sha) => {
    setSelectedCommitSha(sha);
    setLoadingDetails(true);
    try {
      const res = await getCommitDetails(owner, repo, sha);
      setCommitDetails(res);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load commit details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCopySha = (sha, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  // ── Action Executions ──
  const handleRevertConfirm = async () => {
    if (!actionCommit) return;
    setActionLoading(true);
    try {
      const res = await revertCommit(owner, repo, {
        commitSha: actionCommit.sha,
        branch: selectedBranch,
      });
      alert(res.message || "Commit reverted successfully");
      setSafetyAction(null);
      setActionCommit(null);
      setSelectedCommitSha(null);
      fetchCommits(true);
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Revert failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCherryPickConfirm = async () => {
    if (!actionCommit) return;
    setActionLoading(true);
    try {
      const res = await cherryPickCommit(owner, repo, {
        commitSha: actionCommit.sha,
        branch: targetBranchForCherryPick || selectedBranch,
      });
      alert(res.message || "Cherry-pick applied successfully");
      setSafetyAction(null);
      setActionCommit(null);
      fetchCommits(true);
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Cherry-pick failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetConfirm = async () => {
    if (!actionCommit) return;
    setActionLoading(true);
    try {
      const res = await resetBranch(owner, repo, {
        branch: selectedBranch,
        targetSha: actionCommit.sha,
        mode: resetMode,
      });
      alert(res.message || "Branch reset successfully");
      setSafetyAction(null);
      setActionCommit(null);
      setSelectedCommitSha(null);
      fetchCommits(true);
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Reset failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCommits = commits.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.message?.toLowerCase().includes(q) ||
      c.sha.toLowerCase().includes(q) ||
      c.author?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/60 dark:bg-[#111113]/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-soft text-accent-primary border border-accent-border">
            <GitCommit size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Commit History</span>
              {selectedBranch && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-accent-soft text-accent-primary border border-accent-border font-bold">
                  {selectedBranch}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
              Inspect past commits, inspect file diffs, and perform Git recovery operations.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commits or SHA..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-accent-primary"
          />
        </div>
      </div>

      {/* Commit List */}
      {loading && commits.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-accent-primary mb-3" />
          <p className="text-sm font-medium">Traversing Git commit log...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm">
          {error}
        </div>
      ) : filteredCommits.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white/40 dark:bg-white/[0.02] border border-white/5 rounded-2xl">
          <GitCommit size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-bold">No commits found matching query.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCommits.map((commit, idx) => {
            const firstLine = commit.message?.split("\n")[0] || "No commit message";
            const dateStr = commit.author?.date
              ? new Date(commit.author.date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            return (
              <div
                key={commit.sha}
                onClick={() => loadCommitDetails(commit.sha)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#111113] border border-slate-200/90 dark:border-white/5 hover:border-accent-primary/50 dark:hover:border-accent-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-4">
                  {commit.author?.avatar_url ? (
                    <img
                      src={commit.author.avatar_url}
                      alt="avatar"
                      className="w-9 h-9 rounded-full border border-white/10 shrink-0 mt-0.5"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="w-9 h-9 rounded-full bg-accent-soft text-accent-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-accent-border"
                    style={{ display: commit.author?.avatar_url ? "none" : "flex" }}
                  >
                    {commit.author?.name?.[0]?.toUpperCase() || "U"}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-accent-primary transition-colors">
                      {firstLine}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-white/40 flex-wrap">
                      <span className="font-medium text-slate-700 dark:text-white/70">
                        {commit.author?.name || "Unknown"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={11} /> {dateStr}
                      </span>
                      {commit.verified && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 flex items-center gap-0.5 text-[10px] font-bold">
                            <ShieldCheck size={12} /> Verified
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleCopySha(commit.sha, e)}
                    className="font-mono text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 transition-colors flex items-center gap-1.5"
                    title="Copy full SHA"
                  >
                    {copiedSha === commit.sha ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span>{commit.shortSha}</span>
                  </button>
                  <div className="p-1 text-slate-400 group-hover:text-accent-primary transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && !searchQuery && (
            <div className="pt-3 text-center">
              <Button
                variant="secondary"
                onClick={() => {
                  setPage((p) => p + 1);
                  fetchCommits();
                }}
                disabled={loading}
                className="px-8"
              >
                {loading ? "Loading more..." : "Load Older Commits"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── COMMIT DETAILS & DIFF INSPECTION MODAL ── */}
      <Modal
        isOpen={!!selectedCommitSha}
        onClose={() => {
          setSelectedCommitSha(null);
          setCommitDetails(null);
        }}
        title={
          <div className="flex items-center gap-2 font-mono text-xs">
            <GitCommit size={16} className="text-accent-primary" />
            <span>Commit {selectedCommitSha?.substring(0, 7)}</span>
          </div>
        }
        className="max-w-4xl"
      >
        {loadingDetails || !commitDetails ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-accent-primary mx-auto mb-2" />
            <p className="text-xs font-mono">Generating unified commit diff...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-1">
            {/* Commit Meta Header */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                {commitDetails.message}
              </h3>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-white/60">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 dark:text-white">
                    {commitDetails.author?.name}
                  </span>
                  <span>•</span>
                  <span>{commitDetails.author?.email}</span>
                  <span>•</span>
                  <span>{new Date(commitDetails.author?.date).toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                    <Plus size={13} /> {commitDetails.stats?.additions || 0}
                  </span>
                  <span className="text-rose-500 font-bold flex items-center gap-0.5">
                    <Minus size={13} /> {commitDetails.stats?.deletions || 0}
                  </span>
                  <span className="text-slate-400">
                    {commitDetails.files?.length || 0} changed files
                  </span>
                </div>
              </div>
            </div>

            {/* Commit Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/10">
              <div className="text-xs font-bold text-slate-700 dark:text-white/70">
                Git Semantics Actions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setActionCommit(commitDetails);
                    setSafetyAction("cherry-pick");
                  }}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <GitBranch size={13} /> Cherry-pick
                </Button>
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => {
                    setActionCommit(commitDetails);
                    setSafetyAction("revert");
                  }}
                  className="flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
                >
                  <RotateCcw size={13} /> Revert Commit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setActionCommit(commitDetails);
                    setSafetyAction("reset");
                  }}
                  className="flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white"
                >
                  <GitCommit size={13} /> Reset Branch to Here
                </Button>
              </div>
            </div>

            {/* Changed Files Diffs */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                Changed Files & Diffs ({commitDetails.files?.length || 0})
              </h4>
              {commitDetails.files?.map((file, idx) => (
                <GitDiffViewer
                  key={file.filename || idx}
                  filename={file.filename}
                  patch={file.patch}
                  status={file.status}
                  additions={file.additions}
                  deletions={file.deletions}
                  defaultExpanded={idx === 0 || commitDetails.files.length <= 3}
                />
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── SAFETY MODALS ── */}
      {safetyAction === "revert" && (
        <GitSafetyModal
          isOpen={true}
          onClose={() => setSafetyAction(null)}
          onConfirm={handleRevertConfirm}
          severity="yellow"
          title={`Revert Commit ${actionCommit?.sha?.substring(0, 7)}`}
          description={`Reverting will create a brand new commit on '${selectedBranch}' that reverses all changes introduced by commit ${actionCommit?.sha?.substring(0, 7)}.`}
          impactDetails={[
            `Inverts changes in ${actionCommit?.files?.length || 0} files`,
            `Branch '${selectedBranch}' will advance with a new revert commit`,
            `No commit history will be deleted (non-destructive history preservation)`,
          ]}
          confirmText="Create Revert Commit"
          loading={actionLoading}
        />
      )}

      {safetyAction === "cherry-pick" && (
        <Modal
          isOpen={true}
          onClose={() => setSafetyAction(null)}
          title={`Cherry-pick Commit ${actionCommit?.sha?.substring(0, 7)}`}
          className="max-w-md"
        >
          <div className="space-y-4 pt-1">
            <p className="text-xs text-slate-600 dark:text-white/80 leading-relaxed">
              Apply the specific changes introduced by <strong className="text-white font-mono">{actionCommit?.sha?.substring(0, 7)}</strong> onto a target branch.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70">
                Target Branch to Apply Changes:
              </label>
              <select
                value={targetBranchForCherryPick}
                onChange={(e) => setTargetBranchForCherryPick(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-accent-primary"
              >
                {branches.map((b) => (
                  <option key={b} value={b} className="dark:bg-[#1a1a1c]">
                    {b} {b === selectedBranch ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setSafetyAction(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleCherryPickConfirm}
                disabled={actionLoading}
                className="bg-accent-primary text-accent-foreground"
              >
                {actionLoading ? "Applying..." : "Apply Cherry-pick"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {safetyAction === "reset" && (
        <GitSafetyModal
          isOpen={true}
          onClose={() => setSafetyAction(null)}
          onConfirm={handleResetConfirm}
          severity="red"
          title={`Reset Branch '${selectedBranch}' to ${actionCommit?.sha?.substring(0, 7)}`}
          description={`DANGER — Moving the branch pointer will reset the HEAD of '${selectedBranch}' back to ${actionCommit?.sha?.substring(0, 7)}. Any commits ahead of this point will become disconnected.`}
          requireInputText="RESET"
          impactDetails={[
            `Branch '${selectedBranch}' reference will be force-updated to ${actionCommit?.sha?.substring(0, 7)}`,
            `Commits made after this point will no longer appear on '${selectedBranch}'`,
            `Mode selected: ${resetMode.toUpperCase()}`,
          ]}
          confirmText="Force Reset Branch"
          loading={actionLoading}
        />
      )}
    </div>
  );
}
