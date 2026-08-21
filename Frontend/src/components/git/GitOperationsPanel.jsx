import { useState } from "react";
import { mergeBranches, cherryPickCommit, revertCommit, resetBranch } from "../../api/github.api";
import GitSafetyModal from "./GitSafetyModal";
import Button from "../ui/Button";
import {
  GitMerge,
  GitBranch,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Info,
} from "lucide-react";

export default function GitOperationsPanel({
  owner,
  repo,
  selectedBranch,
  branches = [],
  onRefreshRepo,
}) {
  const [activeTool, setActiveTool] = useState("merge"); // 'merge' | 'cherry-pick' | 'revert' | 'reset'

  // Merge state
  const [mergeHead, setMergeHead] = useState("");
  const [mergeBase, setMergeBase] = useState(selectedBranch || "main");
  const [mergeMessage, setMergeMessage] = useState("");
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);

  // Cherry-pick state
  const [cpSha, setCpSha] = useState("");
  const [cpBranch, setCpBranch] = useState(selectedBranch || "main");
  const [cpLoading, setCpLoading] = useState(false);

  // Revert state
  const [revertSha, setRevertSha] = useState("");
  const [revertBranch, setRevertBranch] = useState(selectedBranch || "main");
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertLoading, setRevertLoading] = useState(false);

  // Reset state
  const [resetSha, setResetSha] = useState("");
  const [resetBranchTarget, setResetBranchTarget] = useState(selectedBranch || "main");
  const [resetMode, setResetMode] = useState("mixed"); // 'soft' | 'mixed' | 'hard'
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Handlers
  const handleMergeSubmit = async () => {
    if (!mergeHead || !mergeBase) return;
    setMergeLoading(true);
    try {
      const res = await mergeBranches(owner, repo, {
        head: mergeHead,
        base: mergeBase,
        commitMessage: mergeMessage.trim() || undefined,
      });
      alert(res.message || "Branches merged successfully");
      setShowMergeModal(false);
      setMergeHead("");
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Merge failed");
    } finally {
      setMergeLoading(false);
    }
  };

  const handleCherryPickSubmit = async (e) => {
    e.preventDefault();
    if (!cpSha.trim()) return;
    setCpLoading(true);
    try {
      const res = await cherryPickCommit(owner, repo, {
        commitSha: cpSha.trim(),
        branch: cpBranch || selectedBranch,
      });
      alert(res.message || "Cherry-pick applied successfully");
      setCpSha("");
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Cherry-pick failed");
    } finally {
      setCpLoading(false);
    }
  };

  const handleRevertSubmit = async () => {
    if (!revertSha.trim()) return;
    setRevertLoading(true);
    try {
      const res = await revertCommit(owner, repo, {
        commitSha: revertSha.trim(),
        branch: revertBranch || selectedBranch,
      });
      alert(res.message || "Commit reverted successfully");
      setShowRevertModal(false);
      setRevertSha("");
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Revert failed");
    } finally {
      setRevertLoading(false);
    }
  };

  const handleResetSubmit = async () => {
    if (!resetSha.trim()) return;
    setResetLoading(true);
    try {
      const res = await resetBranch(owner, repo, {
        branch: resetBranchTarget || selectedBranch,
        targetSha: resetSha.trim(),
        mode: resetMode,
      });
      alert(res.message || "Branch reset successfully");
      setShowResetModal(false);
      setResetSha("");
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  const tools = [
    { id: "merge", label: "Merge Branches", icon: GitMerge, severity: "yellow" },
    { id: "cherry-pick", label: "Cherry-pick Commit", icon: GitBranch, severity: "yellow" },
    { id: "revert", label: "Revert Commit", icon: RotateCcw, severity: "yellow" },
    { id: "reset", label: "Reset Branch HEAD", icon: ShieldAlert, severity: "red" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white/60 dark:bg-[#111113]/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <span>Git Operations Control Center</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
          Execute branch merges, commit cherry-picks, reverts, and branch resets safely.
        </p>

        {/* Tool Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {tools.map((t) => {
            const Icon = t.icon;
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-bold transition-all duration-200 ${
                  active
                    ? t.severity === "red"
                      ? "bg-rose-500/10 border-rose-500 text-rose-400 shadow-sm"
                      : "bg-accent-soft border-accent-primary text-accent-primary shadow-sm"
                    : "bg-white dark:bg-black/30 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TOOL: MERGE ── */}
      {activeTool === "merge" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 shadow-lg space-y-5">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <GitMerge size={18} className="text-accent-primary" />
              <span>Merge One Branch into Another</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Incorporate commits from a feature branch directly into a base branch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70 mb-1.5">
                FROM: Source branch with changes (Head)
              </label>
              <select
                value={mergeHead}
                onChange={(e) => setMergeHead(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-accent-primary"
              >
                <option value="">Select source branch...</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70 mb-1.5">
                INTO: Target branch to receive merge (Base)
              </label>
              <select
                value={mergeBase}
                onChange={(e) => setMergeBase(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-accent-primary"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b} {b === selectedBranch ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
              Custom Commit Message (Optional)
            </label>
            <input
              type="text"
              value={mergeMessage}
              onChange={(e) => setMergeMessage(e.target.value)}
              placeholder={`Merge branch '${mergeHead || "source"}' into '${mergeBase || "target"}'`}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-accent-primary"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              disabled={!mergeHead || !mergeBase || mergeHead === mergeBase}
              onClick={() => setShowMergeModal(true)}
              className="bg-accent-primary text-accent-foreground shadow-accent-glow flex items-center gap-1.5"
            >
              <GitMerge size={16} /> Merge Branches
            </Button>
          </div>
        </div>
      )}

      {/* ── TOOL: CHERRY-PICK ── */}
      {activeTool === "cherry-pick" && (
        <form
          onSubmit={handleCherryPickSubmit}
          className="p-6 rounded-3xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 shadow-lg space-y-5"
        >
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch size={18} className="text-accent-primary" />
              <span>Cherry-pick a Commit</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Apply specific file changes from a single historical commit onto your target branch.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                Commit SHA to Cherry-pick
              </label>
              <input
                type="text"
                value={cpSha}
                onChange={(e) => setCpSha(e.target.value)}
                placeholder="e.g. 7a8b9c0d1e2f..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:border-accent-primary"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                Target Branch
              </label>
              <select
                value={cpBranch}
                onChange={(e) => setCpBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-accent-primary"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b} {b === selectedBranch ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={!cpSha.trim() || cpLoading}
              className="bg-accent-primary text-accent-foreground shadow-accent-glow"
            >
              {cpLoading ? "Applying..." : "Apply Cherry-pick"}
            </Button>
          </div>
        </form>
      )}

      {/* ── TOOL: REVERT ── */}
      {activeTool === "revert" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 shadow-lg space-y-5">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw size={18} className="text-amber-400" />
              <span>Revert a Commit</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Create a new commit that inverts the changes made in a previous commit.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                Commit SHA to Revert
              </label>
              <input
                type="text"
                value={revertSha}
                onChange={(e) => setRevertSha(e.target.value)}
                placeholder="e.g. 7a8b9c0d1e2f..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/50 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:border-accent-primary"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                Branch to Apply Revert
              </label>
              <select
                value={revertBranch}
                onChange={(e) => setRevertBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-accent-primary"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b} {b === selectedBranch ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              disabled={!revertSha.trim() || revertLoading}
              onClick={() => setShowRevertModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20"
            >
              Revert Commit
            </Button>
          </div>
        </div>
      )}

      {/* ── TOOL: RESET ── */}
      {activeTool === "reset" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111113] border border-rose-500/30 shadow-2xl shadow-rose-950/20 space-y-6">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-rose-500 flex items-center gap-2">
              <ShieldAlert size={20} />
              <span>Reset Branch HEAD (Destructive Operation)</span>
            </h4>
            <p className="text-xs text-white/60">
              Move the branch pointer back to a historical commit.
            </p>
          </div>

          {/* Mode Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "soft",
                title: "Soft Reset",
                desc: "Moves HEAD. Leaves working tree and index changes untouched.",
              },
              {
                id: "mixed",
                title: "Mixed Reset (Default)",
                desc: "Moves HEAD and updates index. Preserves working tree changes.",
              },
              {
                id: "hard",
                title: "Hard Reset",
                desc: "Moves HEAD, index, and completely discards all newer changes.",
                danger: true,
              },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setResetMode(m.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                  resetMode === m.id
                    ? m.danger
                      ? "bg-rose-500/20 border-rose-500 text-white ring-2 ring-rose-500/40"
                      : "bg-accent-soft border-accent-primary text-white ring-2 ring-accent-primary/40"
                    : "bg-white/5 border-white/5 text-white/60 hover:border-white/20"
                }`}
              >
                <div className="font-bold text-xs">{m.title}</div>
                <p className="text-[11px] text-white/60 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                Target Commit SHA to Reset To
              </label>
              <input
                type="text"
                value={resetSha}
                onChange={(e) => setResetSha(e.target.value)}
                placeholder="e.g. 7a8b9c0d1e2f..."
                className="w-full px-4 py-2.5 rounded-xl border border-rose-500/40 bg-white dark:bg-black/50 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-wider mb-2">
                Branch to Reset
              </label>
              <select
                value={resetBranchTarget}
                onChange={(e) => setResetBranchTarget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-rose-500"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b} {b === selectedBranch ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              disabled={!resetSha.trim() || resetLoading}
              onClick={() => setShowResetModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30"
            >
              Proceed to Reset Confirmation
            </Button>
          </div>
        </div>
      )}

      {/* ── SAFETY MODALS ── */}
      {showMergeModal && (
        <GitSafetyModal
          isOpen={true}
          onClose={() => setShowMergeModal(false)}
          onConfirm={handleMergeSubmit}
          severity="yellow"
          title={`Merge '${mergeHead}' into '${mergeBase}'`}
          description={`This operation will combine all commits from '${mergeHead}' into '${mergeBase}' and create a merge commit on '${mergeBase}'.`}
          impactDetails={[
            `Branch '${mergeBase}' will receive all updates from '${mergeHead}'`,
            `Branch '${mergeHead}' will remain intact`,
          ]}
          confirmText="Confirm Merge"
          loading={mergeLoading}
        />
      )}

      {showRevertModal && (
        <GitSafetyModal
          isOpen={true}
          onClose={() => setShowRevertModal(false)}
          onConfirm={handleRevertSubmit}
          severity="yellow"
          title={`Revert Commit ${revertSha.substring(0, 7)}`}
          description={`This will invert the changes made in commit ${revertSha.substring(0, 7)} and commit the inverted state to '${revertBranch}'.`}
          confirmText="Create Revert Commit"
          loading={revertLoading}
        />
      )}

      {showResetModal && (
        <GitSafetyModal
          isOpen={true}
          onClose={() => setShowResetModal(false)}
          onConfirm={handleResetSubmit}
          severity="red"
          title={`Force Reset '${resetBranchTarget}' to ${resetSha.substring(0, 7)}`}
          description={`DANGER — Resetting branch '${resetBranchTarget}' to commit ${resetSha.substring(0, 7)} will rewrite the branch reference. Any newer commits will become detached.`}
          requireInputText="RESET"
          impactDetails={[
            `Branch '${resetBranchTarget}' will point directly to ${resetSha.substring(0, 7)}`,
            `Mode: ${resetMode.toUpperCase()}`,
          ]}
          confirmText="Force Reset Branch"
          loading={resetLoading}
        />
      )}
    </div>
  );
}
