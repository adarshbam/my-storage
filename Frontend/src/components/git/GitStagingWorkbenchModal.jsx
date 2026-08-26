import { useState, useEffect } from "react";
import {
  GitCommit,
  Plus,
  Minus,
  CheckCircle2,
  FileCode,
  Loader2,
  X,
  Layers,
  EyeOff,
  Settings,
  ChevronDown,
  ChevronRight,
  Shield,
  Save,
} from "lucide-react";
import {
  getWorkspaceStatus,
  stageFiles,
  unstageFiles,
  commitWorkspace,
  updateGitignore,
  addIgnoreRule,
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
  const [showGitignoreEditor, setShowGitignoreEditor] = useState(false);
  const [gitignoreText, setGitignoreText] = useState("");
  const [savingGitignore, setSavingGitignore] = useState(false);
  const [showIgnoredFiles, setShowIgnoredFiles] = useState(false);
  const [quickIgnoreFile, setQuickIgnoreFile] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getWorkspaceStatus({
        ...(workspaceId && { workspaceId }),
        ...(folderId && { folderId }),
      });
      setStatusData(res);
      if (res.gitignoreContent !== undefined) {
        setGitignoreText(res.gitignoreContent || "");
      }
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
      setShowGitignoreEditor(false);
      setQuickIgnoreFile(null);
    }
  }, [isOpen, workspaceId, folderId]);

  if (!isOpen) return null;

  const resolvedWorkspaceId = workspaceId || statusData?.workspace?._id;

  const handleStageAll = async () => {
    if (!resolvedWorkspaceId) return;
    try {
      await stageFiles({ workspaceId: resolvedWorkspaceId, folderId, stageAll: true });
      fetchStatus();
    } catch (err) {
      alert(err.message || "Failed to stage all files");
    }
  };

  const handleUnstageAll = async () => {
    if (!resolvedWorkspaceId) return;
    try {
      await unstageFiles({ workspaceId: resolvedWorkspaceId, folderId, unstageAll: true });
      fetchStatus();
    } catch (err) {
      alert(err.message || "Failed to unstage files");
    }
  };

  const handleToggleStage = async (file) => {
    if (!resolvedWorkspaceId) return;
    try {
      if (file.staged) {
        await unstageFiles({ workspaceId: resolvedWorkspaceId, folderId, filePaths: [file.path] });
      } else {
        await stageFiles({ workspaceId: resolvedWorkspaceId, folderId, filePaths: [file.path] });
      }
      fetchStatus();
    } catch (err) {
      alert(err.message || "Failed to update file staging state");
    }
  };

  const handleAddIgnoreRule = async (pattern) => {
    if (!resolvedWorkspaceId || !pattern) return;
    try {
      setLoading(true);
      await addIgnoreRule({ workspaceId: resolvedWorkspaceId, folderId, pattern });
      setQuickIgnoreFile(null);
      await fetchStatus();
    } catch (err) {
      alert(err.message || "Failed to add ignore rule");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGitignore = async () => {
    if (!resolvedWorkspaceId) return;
    try {
      setSavingGitignore(true);
      await updateGitignore({ workspaceId: resolvedWorkspaceId, folderId, content: gitignoreText });
      setShowGitignoreEditor(false);
      await fetchStatus();
    } catch (err) {
      alert(err.message || "Failed to save .gitignore");
    } finally {
      setSavingGitignore(false);
    }
  };

  const handleCommitSubmit = async (e) => {
    e.preventDefault();
    if (!commitMessage.trim() || !resolvedWorkspaceId) return;

    if (!statusData?.staged || statusData.staged.length === 0) {
      alert("Please stage at least one file before committing.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await commitWorkspace({
        workspaceId: resolvedWorkspaceId,
        folderId,
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
  const ignoredFiles = statusData?.ignored || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-accent-primary flex items-center justify-center border border-accent-border">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Git Staging Workbench & Commit Drawer
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Branch:</span>
                <span className="font-mono font-bold text-accent-primary">
                  {statusData?.workspace?.branch || "main"}
                </span>
                {statusData?.workspace?.repoName && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{statusData.workspace.repoOwner}/{statusData.workspace.repoName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowGitignoreEditor((prev) => !prev);
                setQuickIgnoreFile(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                showGitignoreEditor
                  ? "bg-accent-primary text-accent-foreground border-accent-primary shadow-md shadow-accent-glow"
                  : "bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/20"
              }`}
              title="View and edit .gitignore patterns"
            >
              <Settings size={13} />
              <span>.gitignore</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── GITIGNORE EDITOR OVERLAY / DRAWER ── */}
        {showGitignoreEditor && (
          <div className="bg-slate-900 border-b border-white/10 p-5 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-accent-primary" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Workspace .gitignore Rules
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Add Presets:</span>
                <button
                  type="button"
                  onClick={() => setGitignoreText((prev) => `${prev.trim()}\n# Logs & Temp\n*.log\n*.tmp\n.DS_Store\n`)}
                  className="px-2 py-0.5 text-[10px] font-mono bg-white/10 hover:bg-white/20 text-slate-300 rounded"
                >
                  + Logs
                </button>
                <button
                  type="button"
                  onClick={() => setGitignoreText((prev) => `${prev.trim()}\n# Node.js\nnode_modules/\ndist/\n.env*\n`)}
                  className="px-2 py-0.5 text-[10px] font-mono bg-white/10 hover:bg-white/20 text-slate-300 rounded"
                >
                  + Node.js
                </button>
                <button
                  type="button"
                  onClick={() => setGitignoreText((prev) => `${prev.trim()}\n# Python\n__pycache__/\n*.pyc\n.venv/\n`)}
                  className="px-2 py-0.5 text-[10px] font-mono bg-white/10 hover:bg-white/20 text-slate-300 rounded"
                >
                  + Python
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={gitignoreText}
              onChange={(e) => setGitignoreText(e.target.value)}
              placeholder="e.g. node_modules/&#10;*.log&#10;.env*&#10;build/"
              className="w-full px-3 py-2 text-xs font-mono bg-black/60 border border-white/15 rounded-xl text-accent-primary outline-none focus:border-accent-primary leading-relaxed custom-scrollbar"
            />

            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-[11px] text-slate-400">
                Matching files will be excluded from working tree changes and commit packages.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGitignoreEditor(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGitignore}
                  disabled={savingGitignore}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-accent-primary text-accent-foreground shadow-md shadow-accent-glow hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {savingGitignore ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Save .gitignore</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Column 1: Working Tree & Staged Changes */}
          <div className="space-y-5">
            {/* Working Tree (Unstaged) */}
            <div className="bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Working Tree ({unstagedFiles.length})
                  </span>
                </div>
                {unstagedFiles.length > 0 && (
                  <button
                    onClick={handleStageAll}
                    className="flex items-center gap-1 text-[11px] font-bold text-accent-primary dark:text-accent-primary px-2.5 py-1 rounded-lg bg-accent-soft hover:bg-accent-soft/80 border border-accent-border transition-all cursor-pointer"
                    title="Stage all working tree changes"
                  >
                    <Plus size={12} />
                    <span>Stage All</span>
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
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1c1c1f] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5 text-xs transition-colors group"
                    >
                      <div
                        onClick={() => handleToggleStage(file)}
                        className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                      >
                        <FileCode size={14} className="text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                          {file.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            file.status === "added"
                              ? "bg-emerald-500/20 text-accent-primary"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {file.status === "added" ? "UNT" : "MOD"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickIgnoreFile(quickIgnoreFile?.path === file.path ? null : file);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Ignore pattern in .gitignore"
                        >
                          <EyeOff size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStage(file)}
                          className="p-1 rounded-lg text-accent-primary hover:text-white hover:bg-emerald-500 transition-colors"
                          title="Stage file"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Ignore Rule Action Box */}
              {quickIgnoreFile && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <EyeOff size={13} /> Ignore "{quickIgnoreFile.name}"
                    </span>
                    <button
                      onClick={() => setQuickIgnoreFile(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleAddIgnoreRule(quickIgnoreFile.path)}
                      className="px-2 py-1 bg-white dark:bg-black/50 hover:bg-amber-500 hover:text-white text-slate-300 font-mono text-[11px] rounded-lg border border-white/10 transition-colors"
                    >
                      Exact: {quickIgnoreFile.path}
                    </button>
                    {quickIgnoreFile.extension && (
                      <button
                        onClick={() => handleAddIgnoreRule(`*${quickIgnoreFile.extension}`)}
                        className="px-2 py-1 bg-white dark:bg-black/50 hover:bg-amber-500 hover:text-white text-slate-300 font-mono text-[11px] rounded-lg border border-white/10 transition-colors"
                      >
                        All: *{quickIgnoreFile.extension}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Staged Changes */}
            <div className="bg-accent-soft/30 border border-accent-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-accent-primary dark:text-accent-primary uppercase tracking-wider">
                    Staged Changes ({stagedFiles.length})
                  </span>
                </div>
                {stagedFiles.length > 0 && (
                  <button
                    onClick={handleUnstageAll}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-rose-400 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-rose-500/10 border border-slate-300 dark:border-white/10 transition-all cursor-pointer"
                    title="Unstage all staged files"
                  >
                    <Minus size={12} />
                    <span>Unstage All</span>
                  </button>
                )}
              </div>

              {stagedFiles.length === 0 ? (
                <div className="py-5 px-3 text-center text-xs text-slate-400 bg-slate-100/50 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 space-y-1">
                  <p className="font-medium text-slate-600 dark:text-slate-300">
                    No files staged for commit yet.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Click the <strong>`+`</strong> icon or <strong>`+ Stage All`</strong> above to stage changes for this commit.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {stagedFiles.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => handleToggleStage({ ...file, staged: true })}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1c1c1f] hover:bg-rose-500/10 border border-accent-border cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 size={14} className="text-accent-primary shrink-0" />
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                          {file.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-accent-primary">
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

            {/* Ignored Files Accordion */}
            {ignoredFiles.length > 0 && (
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowIgnoredFiles((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <span className="font-medium flex items-center gap-1.5">
                    <EyeOff size={13} className="text-slate-400" />
                    <span>Ignored by .gitignore ({ignoredFiles.length})</span>
                  </span>
                  {showIgnoredFiles ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {showIgnoredFiles && (
                  <div className="p-3 bg-black/20 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                    {ignoredFiles.map((file) => (
                      <div key={file.path} className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-2 py-1 rounded bg-black/40">
                        <span className="truncate">{file.path}</span>
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400">Ignored</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Commit Form */}
          <div className="flex flex-col justify-between bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <form onSubmit={handleCommitSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-xs">
                  <GitCommit size={16} className="text-accent-primary" />
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
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-sans text-slate-900 dark:text-white focus:border-accent-primary"
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
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-sans text-slate-900 dark:text-white focus:border-accent-primary resize-none"
                  />
                </div>
                <div className="p-3 rounded-xl bg-accent-soft border border-accent-border text-[11px] text-accent-primary dark:text-accent-primary leading-relaxed">
                  🚀 <strong>Atomic Push</strong>: Submitting will create Git blobs, build a tree object, and create a verified commit directly on GitHub branch <strong>{statusData?.workspace?.branch || "main"}</strong>.
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                {stagedFiles.length === 0 && unstagedFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStageAll}
                    className="text-xs font-bold text-accent-primary hover:text-accent-primary flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Stage All ({unstagedFiles.length})</span>
                  </button>
                )}
                {stagedFiles.length > 0 && <div />}
                <div className="flex items-center gap-3 ml-auto">
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
                    className="bg-accent-primary text-accent-foreground px-6 py-2.5 text-xs font-bold shadow-lg shadow-accent-glow hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Pushing to GitHub...</span>
                      </>
                    ) : (
                      <>
                        <GitCommit size={15} />
                        <span>
                          Commit & Push ({stagedFiles.length} staged file{stagedFiles.length === 1 ? "" : "s"})
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
