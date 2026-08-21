import { useState, useEffect } from "react";
import {
  getPullRequests,
  createPullRequest,
  getPullRequestDetails,
  mergePullRequest,
  updatePullRequest,
  getPRReviews,
  submitPRReview,
  getPRComments,
  createPRComment,
  compareBranches,
} from "../../api/github.api";
import GitDiffViewer from "./GitDiffViewer";
import GitSafetyModal from "./GitSafetyModal";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import {
  GitPullRequest,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  GitMerge,
  MessageSquare,
  FileCode,
  GitCommit,
  Loader2,
  Search,
  Send,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export default function GitPullRequestsView({
  owner,
  repo,
  selectedBranch,
  branches = [],
  onRefreshRepo,
}) {
  const [prs, setPrs] = useState([]);
  const [stateFilter, setStateFilter] = useState("open"); // 'open' | 'closed' | 'all'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create PR state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prHead, setPrHead] = useState(selectedBranch || "main");
  const [prBase, setPrBase] = useState("main");
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [preSubmitDiff, setPreSubmitDiff] = useState(null);
  const [loadingPreDiff, setLoadingPreDiff] = useState(false);

  // PR Details state
  const [selectedPrNumber, setSelectedPrNumber] = useState(null);
  const [prDetails, setPrDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("files"); // 'files' | 'commits' | 'discussion'

  // PR Review & Comment state
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [reviewEvent, setReviewEvent] = useState("COMMENT");
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Merge state
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [mergeMethod, setMergeMethod] = useState("merge"); // 'merge' | 'squash' | 'rebase'
  const [merging, setMerging] = useState(false);

  const fetchPRs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPullRequests(owner, repo, { state: stateFilter });
      setPrs(res.pullRequests || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load pull requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, [owner, repo, stateFilter]);

  // Load pre-submit diff when creating PR
  useEffect(() => {
    if (showCreateModal && prHead && prBase && prHead !== prBase) {
      setLoadingPreDiff(true);
      compareBranches(owner, repo, prBase, prHead)
        .then((res) => setPreSubmitDiff(res))
        .catch(() => setPreSubmitDiff(null))
        .finally(() => setLoadingPreDiff(false));
    } else {
      setPreSubmitDiff(null);
    }
  }, [showCreateModal, prHead, prBase]);

  const loadPrDetails = async (number) => {
    setSelectedPrNumber(number);
    setLoadingDetails(true);
    try {
      const [details, revs, comms] = await Promise.all([
        getPullRequestDetails(owner, repo, number),
        getPRReviews(owner, repo, number).catch(() => ({ reviews: [] })),
        getPRComments(owner, repo, number).catch(() => ({ comments: [] })),
      ]);
      setPrDetails(details);
      setReviews(revs.reviews || []);
      setComments(comms.comments || []);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load PR details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreatePR = async (e) => {
    e.preventDefault();
    if (!prTitle.trim() || !prHead || !prBase) return;

    setCreating(true);
    try {
      const res = await createPullRequest(owner, repo, {
        title: prTitle.trim(),
        body: prBody.trim(),
        head: prHead,
        base: prBase,
      });
      alert(res.message || "Pull Request created successfully");
      setShowCreateModal(false);
      setPrTitle("");
      setPrBody("");
      fetchPRs();
      if (res.pullRequest?.number) {
        loadPrDetails(res.pullRequest.number);
      }
    } catch (err) {
      alert(err.message || "Failed to create PR");
    } finally {
      setCreating(false);
    }
  };

  const handleMergePR = async () => {
    if (!selectedPrNumber) return;
    setMerging(true);
    try {
      const res = await mergePullRequest(owner, repo, selectedPrNumber, {
        mergeMethod,
        commitTitle: `Merge pull request #${selectedPrNumber} from ${prDetails?.head?.ref}`,
      });
      alert(res.message || "Pull Request merged successfully");
      setShowMergeConfirm(false);
      loadPrDetails(selectedPrNumber);
      fetchPRs();
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Merge failed");
    } finally {
      setMerging(false);
    }
  };

  const handleCloseOrReopenPR = async (newState) => {
    if (!selectedPrNumber) return;
    try {
      const res = await updatePullRequest(owner, repo, selectedPrNumber, {
        state: newState,
      });
      alert(res.message || `PR ${newState}`);
      loadPrDetails(selectedPrNumber);
      fetchPRs();
    } catch (err) {
      alert(err.message || "Failed to update PR state");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPrNumber) return;
    try {
      await createPRComment(owner, repo, selectedPrNumber, {
        body: newComment.trim(),
      });
      setNewComment("");
      const comms = await getPRComments(owner, repo, selectedPrNumber);
      setComments(comms.comments || []);
    } catch (err) {
      alert(err.message || "Failed to add comment");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedPrNumber) return;
    setSubmittingReview(true);
    try {
      await submitPRReview(owner, repo, selectedPrNumber, {
        event: reviewEvent,
        body: reviewBody,
      });
      setReviewBody("");
      const revs = await getPRReviews(owner, repo, selectedPrNumber);
      setReviews(revs.reviews || []);
      alert("Review submitted successfully");
    } catch (err) {
      alert(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredPrs = prs.filter((pr) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      pr.title?.toLowerCase().includes(q) ||
      pr.number?.toString().includes(q) ||
      pr.head?.ref?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/60 dark:bg-[#111113]/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-soft text-accent-primary border border-accent-border">
            <GitPullRequest size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Pull Requests</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
              Review code diffs, submit reviews, and merge changes seamlessly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
            {["open", "closed", "all"].map((st) => (
              <button
                key={st}
                onClick={() => setStateFilter(st)}
                className={`px-3 py-1 rounded-lg capitalize font-bold transition-colors ${
                  stateFilter === st
                    ? "bg-accent-primary text-accent-foreground shadow-sm"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Button
            onClick={() => {
              setPrHead(selectedBranch || "main");
              setPrBase("main");
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 text-xs bg-accent-primary text-accent-foreground shadow-accent-glow"
          >
            <Plus size={14} /> New Pull Request
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter pull requests..."
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-accent-primary font-medium shadow-sm"
        />
      </div>

      {/* PRs List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-accent-primary mx-auto mb-3" />
          <p className="text-sm font-medium">Fetching pull requests...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm">
          {error}
        </div>
      ) : filteredPrs.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white/40 dark:bg-white/[0.02] border border-white/5 rounded-2xl">
          <GitPullRequest size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-bold">No {stateFilter} pull requests found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPrs.map((pr) => {
            const isMerged = pr.isMerged || pr.merged_at;
            const isOpen = pr.state === "open";

            return (
              <div
                key={pr.id || pr.number}
                onClick={() => loadPrDetails(pr.number)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#111113] border border-slate-200/90 dark:border-white/5 hover:border-accent-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1 pr-4">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isMerged
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : isOpen
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    <GitPullRequest size={18} />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-accent-primary transition-colors">
                        {pr.title}
                      </span>
                      <span className="text-xs font-mono text-slate-400 shrink-0">
                        #{pr.number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/40 flex-wrap">
                      <span className="font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-700 dark:text-white/70">
                        {pr.head?.ref}
                      </span>
                      <ArrowRight size={11} className="text-slate-400" />
                      <span className="font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-700 dark:text-white/70">
                        {pr.base?.ref}
                      </span>
                      <span>•</span>
                      <span>by {pr.user?.login}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold border ${
                      isMerged
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        : isOpen
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {isMerged ? "Merged" : isOpen ? "Open" : "Closed"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE PULL REQUEST MODAL ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} className="text-accent-primary" />
            <span>Open Pull Request</span>
          </div>
        }
        className="max-w-3xl"
      >
        <form onSubmit={handleCreatePR} className="space-y-5 pt-1">
          {/* Visual Branch Direction Picker */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
              Branch Merge Direction
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Head / Source */}
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-700 dark:text-white/70 mb-1">
                  FROM (Compare / Source branch)
                </label>
                <select
                  value={prHead}
                  onChange={(e) => setPrHead(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-accent-primary"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Arrow */}
              <div className="p-2 rounded-full bg-accent-soft text-accent-primary border border-accent-border shrink-0">
                <ArrowRight size={18} />
              </div>

              {/* Base / Target */}
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-700 dark:text-white/70 mb-1">
                  INTO (Base / Target branch)
                </label>
                <select
                  value={prBase}
                  onChange={(e) => setPrBase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-accent-primary"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
              Title
            </label>
            <input
              type="text"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              placeholder="e.g. Implement real-time billing calculator"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:border-accent-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
              Description (Optional)
            </label>
            <textarea
              value={prBody}
              onChange={(e) => setPrBody(e.target.value)}
              placeholder="Explain the motivation and context behind these changes..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-accent-primary resize-none"
            />
          </div>

          {/* Pre-submit Diff Preview */}
          {loadingPreDiff ? (
            <div className="p-4 text-center text-xs text-slate-400">
              <Loader2 size={16} className="animate-spin inline mr-2 text-accent-primary" />
              Calculating pre-submit diff...
            </div>
          ) : preSubmitDiff ? (
            <div className="p-3.5 bg-slate-50 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold">
                {preSubmitDiff.total_commits || 0} commit(s) • {preSubmitDiff.files?.length || 0} changed files
              </span>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!prTitle.trim() || creating}
              className="bg-accent-primary text-accent-foreground shadow-accent-glow"
            >
              {creating ? "Opening PR..." : "Create Pull Request"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── PR DETAILS MODAL ── */}
      <Modal
        isOpen={!!selectedPrNumber}
        onClose={() => {
          setSelectedPrNumber(null);
          setPrDetails(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} className="text-accent-primary" />
            <span>Pull Request #{selectedPrNumber}</span>
          </div>
        }
        className="max-w-4xl"
      >
        {loadingDetails || !prDetails ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-accent-primary mx-auto mb-2" />
            <p className="text-xs font-mono">Loading PR details, diffs & reviews...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-1">
            {/* PR Header Meta */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                  {prDetails.title}
                </h3>
                <span
                  className={`text-[10px] uppercase font-mono px-3 py-1 rounded-full font-bold border shrink-0 ${
                    prDetails.merged
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                      : prDetails.state === "open"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  }`}
                >
                  {prDetails.merged ? "Merged" : prDetails.state}
                </span>
              </div>

              {prDetails.body && (
                <p className="text-xs text-slate-700 dark:text-white/80 leading-relaxed bg-white/50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-200 dark:border-white/5">
                  {prDetails.body}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-white/60">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-800 dark:text-white font-bold">
                    {prDetails.head?.ref}
                  </span>
                  <ArrowRight size={12} className="text-slate-400" />
                  <span className="font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-800 dark:text-white font-bold">
                    {prDetails.base?.ref}
                  </span>
                  <span>•</span>
                  <span>Opened by {prDetails.user?.login}</span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-emerald-500 font-bold">+{prDetails.additions || 0}</span>
                  <span className="text-rose-500 font-bold">-{prDetails.deletions || 0}</span>
                </div>
              </div>
            </div>

            {/* Merge Action Bar */}
            {prDetails.state === "open" && (
              <div className="p-4 rounded-2xl bg-accent-soft/20 border border-accent-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Merge Status: {prDetails.mergeable ? "Clean (No Conflicts)" : "Checking..."}</span>
                  </div>
                  <p className="text-[11px] text-white/60">
                    Target branch: <strong className="text-white font-mono">{prDetails.base?.ref}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCloseOrReopenPR("closed")}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Close PR
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowMergeConfirm(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    <GitMerge size={14} /> Merge Pull Request
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
              <button
                onClick={() => setActiveTab("files")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "files"
                    ? "bg-accent-soft text-accent-primary border border-accent-border shadow-sm"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileCode size={14} />
                <span>Changed Files ({prDetails.files?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("commits")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "commits"
                    ? "bg-accent-soft text-accent-primary border border-accent-border shadow-sm"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <GitCommit size={14} />
                <span>Commits ({prDetails.commits?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("discussion")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "discussion"
                    ? "bg-accent-soft text-accent-primary border border-accent-border shadow-sm"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <MessageSquare size={14} />
                <span>Reviews & Discussion ({comments.length + reviews.length})</span>
              </button>
            </div>

            {/* Tab: Files Diffs */}
            {activeTab === "files" && (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {prDetails.files?.map((file, idx) => (
                  <GitDiffViewer
                    key={file.filename || idx}
                    filename={file.filename}
                    patch={file.patch}
                    status={file.status}
                    additions={file.additions}
                    deletions={file.deletions}
                    defaultExpanded={idx === 0 || prDetails.files.length <= 3}
                  />
                ))}
              </div>
            )}

            {/* Tab: Commits */}
            {activeTab === "commits" && (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {prDetails.commits?.map((commit) => (
                  <div
                    key={commit.sha}
                    className="p-3 bg-white dark:bg-[#111113] rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {commit.message}
                      </div>
                      <div className="text-slate-500 dark:text-white/40 text-[11px]">
                        {commit.author?.name} • {new Date(commit.author?.date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60">
                      {commit.shortSha}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Discussion & Reviews */}
            {activeTab === "discussion" && (
              <div className="space-y-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {/* Reviews List */}
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-white">
                        {rev.user?.login}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                          rev.state === "APPROVED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : rev.state === "CHANGES_REQUESTED"
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {rev.state}
                      </span>
                    </div>
                    {rev.body && (
                      <p className="text-xs text-slate-600 dark:text-white/80">{rev.body}</p>
                    )}
                  </div>
                ))}

                {/* Comments List */}
                {comments.map((comm) => (
                  <div
                    key={comm.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-1"
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-white">
                      {comm.user?.login}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-white/80 leading-relaxed">
                      {comm.body}
                    </p>
                  </div>
                ))}

                {/* Submit Review Box */}
                {prDetails.state === "open" && (
                  <form
                    onSubmit={handleSubmitReview}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Submit Code Review
                    </div>

                    <div className="flex gap-2">
                      {[
                        { id: "APPROVE", label: "Approve" },
                        { id: "COMMENT", label: "Comment" },
                        { id: "REQUEST_CHANGES", label: "Request Changes" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setReviewEvent(item.id)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            reviewEvent === item.id
                              ? "bg-accent-soft text-accent-primary border-accent-border shadow-sm"
                              : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/50"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={reviewBody}
                      onChange={(e) => setReviewBody(e.target.value)}
                      placeholder="Leave a review comment..."
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-accent-primary resize-none"
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={submittingReview}
                        size="sm"
                        className="bg-accent-primary text-accent-foreground text-xs"
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── MERGE PR CONFIRMATION (YELLOW SAFETY) ── */}
      {showMergeConfirm && (
        <GitSafetyModal
          isOpen={true}
          onClose={() => setShowMergeConfirm(false)}
          onConfirm={handleMergePR}
          severity="yellow"
          title={`Merge Pull Request #${selectedPrNumber}`}
          description={`Merging will incorporate all changes from '${prDetails?.head?.ref}' into '${prDetails?.base?.ref}'.`}
          impactDetails={[
            `${prDetails?.files?.length || 0} files will be updated on '${prDetails?.base?.ref}'`,
            `Merge strategy: ${mergeMethod.toUpperCase()}`,
            `PR #${selectedPrNumber} will be closed as merged`,
          ]}
          confirmText="Confirm Merge"
          loading={merging}
        />
      )}
    </div>
  );
}
