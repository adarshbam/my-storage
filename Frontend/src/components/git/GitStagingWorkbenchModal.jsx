import { useState, useEffect } from "react";
import {
  GitCommit,
  CheckSquare,
  Square,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ArrowRight,
  Loader2,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  getWorkspaceStatus,
  stageFiles,
  unstageFiles,
  commitWorkspace,
} from "../../api/gitWorkspace.api";
import Button from "../ui/Button";

export default function GitStagingWorkbenchModal({
  isOpen,
  onClose,
  workspaceId,
  folderId,
  onCommitted,
}) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [commitDescription, setCommitDescription] = useState("");
  const [selectedFileForDiff, setSelectedFileForDiff] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getWorkspaceStatus({
        ...(workspaceId && { workspaceId }),
        ...(folderId && { folderId }),
      });
      setStatusData(res);
    } catch (err) {
      console.error("Error loading workspace status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setCommitMessage("");
      setCommitDescription("");
      setSelectedFileForDiff(null);
    }
  }, [isOpen, workspaceId, folderId]);

  if (!isOpen) return null;

  const resolvedWorkspaceId = workspaceId || statusData?.workspace?._id;

  const handleStageAll = async () => {
    if (!resolvedWorkspaceId) return;
    try {
      await stageFiles({ workspaceId: resolvedWorkspaceId, stageAll: true });
      fetchStatus();
    } catch (err) {
      alert(err.message || "Failed to stage all files");
    }
  };

  const handleUnstageAll = async () => {
    if (!resolvedWorkspaceId) return;
    try {
      await unstageFiles({ workspaceId: resolvedWorkspaceId, unstageAll: true });
      fetchStatus();
    } catch (err) {
      alert(err.message || "Failed to unstage files");
    }
  };

  const handleToggleStage = async (file) => {
    if (!resolvedWorkspaceId) return;
    try {
      if (file.staged) {
        await unstageFiles({ workspaceId: resolvedWorkspaceId, filePaths: [file.path] });
      } else {
        await stageFiles({ workspaceId: resolvedWorkspaceId, filePaths: [file.path] });
      }
      fetchStatus();
    } catch (err) {
      alert(err.message || "Failed to update file staging state");
    }
  };

  const handleCommitSubmit = async (e) => {
    e.preventDefault();
    if (!commitMessage.trim() || !resolvedWorkspaceId) return;

    if (!statusData?.staged || statusData.staged.length === 0) {
      alert("Please stage at least one change before committing.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await commitWorkspace({
        workspaceId: resolvedWorkspaceId,
        message: commitMessage.trim(),
        description: commitDescription.trim() || undefined,
      });

      alert(res.message || "Committed and pushed to GitHub successfully!");
      if (onCommitted) onCommitted();
      onClose();
    } catch (err) {
      alert(err.message || "Commit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const unstagedFiles = [
    ...(statusData?.untracked || []).filter((f) => !f.staged),
    ...(statusData?.modified || []).filter((f) => !f.staged),
  ];

  const stagedFiles = statusData?.staged || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Git Staging Workbench & Commit Drawer</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target Branch: <strong className="font-mono text-emerald-400">{statusData?.workspace?.branch || "main"}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar">
          {/* Column 1: Working Tree & Staging Area */}
          <div className="space-y-6">
            {/* Unstaged Changes */}
            <div className="bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Working Tree ({unstagedFiles.length})
                  </span>
                </div>
                {unstagedFiles.length > 0 && (
                  <button
                    onClick={handleStageAll}
                    className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                  >
                    + Stage All
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-6 flex justify-center text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : unstagedFiles.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No unstaged changes in working tree.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {unstagedFiles.map((file) => (
                    <div
                      key={file._id || file.path}
                      onClick={() => handleToggleStage(file)}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1c1c1f] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode size={14} className="text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                          {file.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            file.status === "added"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {file.status === "added" ? "UNT" : "MOD"}
                        </span>
                        <button className="text-emerald-500 hover:text-emerald-400">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staged Changes */}
            <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">
                    Staged Changes ({stagedFiles.length})
                  </span>
                </div>
                {stagedFiles.length > 0 && (
                  <button
                    onClick={handleUnstageAll}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-400 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 transition-colors"
                  >
                    - Unstage All
                  </button>
                )}
              </div>

              {stagedFiles.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No files staged for commit yet. Stage files from the working tree above.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {stagedFiles.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => handleToggleStage({ ...file, staged: true })}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1c1c1f] hover:bg-slate-100 dark:hover:bg-white/5 border border-emerald-500/30 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                          {file.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          STAGED
                        </span>
                        <button className="text-rose-400 hover:text-rose-300">
                          <Minus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Commit Form */}
          <div className="flex flex-col justify-between bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <form onSubmit={handleCommitSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-xs">
                  <GitCommit size={16} className="text-emerald-400" />
                  <span>Create Atomic Multi-File Commit</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Commit Message <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="feat: add new storage integration modules"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-sans text-slate-900 dark:text-white focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Extended Description (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={commitDescription}
                    onChange={(e) => setCommitDescription(e.target.value)}
                    placeholder="Describe the changes made across all staged files..."
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-sans text-slate-900 dark:text-white focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-300 leading-relaxed">
                  🚀 <strong>Atomic Push</strong>: Submitting will create Git blobs, build a tree object, and create a verified commit directly on GitHub branch <strong>{statusData?.workspace?.branch || "main"}</strong>.
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={!commitMessage.trim() || stagedFiles.length === 0 || submitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Pushing to GitHub...</span>
                    </>
                  ) : (
                    <>
                      <GitCommit size={15} />
                      <span>Commit & Push ({stagedFiles.length} files)</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
