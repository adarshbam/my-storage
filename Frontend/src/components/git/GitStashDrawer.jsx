import { useState, useEffect } from "react";
import {
  Archive,
  RotateCcw,
  Trash2,
  Plus,
  Loader2,
  X,
  Clock,
  FileCode,
  CheckCircle2,
} from "lucide-react";
import {
  getStashes,
  stashChanges,
  popStash,
  dropStash,
  getWorkspaceStatus,
} from "../../api/gitWorkspace.api";
import Button from "../ui/Button";

export default function GitStashDrawer({
  isOpen,
  onClose,
  workspaceId,
  folderId,
  onStashUpdated,
}) {
  const [stashes, setStashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stashMessage, setStashMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedStash, setSelectedStash] = useState(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(workspaceId);

  const fetchStashes = async () => {
    try {
      setLoading(true);
      let targetWId = workspaceId || activeWorkspaceId;
      if (!targetWId && folderId) {
        const statusRes = await getWorkspaceStatus({ folderId });
        if (statusRes.workspace?._id) {
          targetWId = statusRes.workspace._id;
          setActiveWorkspaceId(targetWId);
        }
      }
      if (targetWId) {
        const res = await getStashes(targetWId, folderId ? { folderId } : {});
        setStashes(res.stashes || []);
      }
    } catch (err) {
      console.error("Error loading stashes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveWorkspaceId(workspaceId);
      fetchStashes();
      setStashMessage("");
      setSelectedStash(null);
    }
  }, [isOpen, workspaceId, folderId]);

  if (!isOpen) return null;

  const handleSaveStash = async (e) => {
    e.preventDefault();
    const targetWId = workspaceId || activeWorkspaceId;
    if (!targetWId && !folderId) return;

    try {
      setSubmitting(true);
      const res = await stashChanges({
        workspaceId: targetWId,
        folderId,
        message: stashMessage.trim() || "WIP on branch",
      });
      alert(res.message || "Working changes stashed successfully!");
      setStashMessage("");
      fetchStashes();
      if (onStashUpdated) onStashUpdated();
    } catch (err) {
      alert(err.message || "Failed to stash changes");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePopStash = async (stashId) => {
    try {
      const res = await popStash(stashId);
      alert(res.message || "Stash applied successfully!");
      fetchStashes();
      if (onStashUpdated) onStashUpdated();
    } catch (err) {
      alert(err.message || "Failed to apply stash");
    }
  };

  const handleDropStash = async (stashId) => {
    if (!window.confirm("Are you sure you want to drop this stash? This cannot be undone.")) return;
    try {
      await dropStash(stashId);
      fetchStashes();
    } catch (err) {
      alert(err.message || "Failed to drop stash");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Archive size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Git Stash Snapshots
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Temporarily shelve dirty working files to clean your workspace
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

        {/* Stash New Changes Box */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
          <form onSubmit={handleSaveStash} className="flex items-center gap-3">
            <input
              type="text"
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              placeholder="Stash label (e.g. 'Draft UI redesign before pull')..."
              className="flex-1 px-4 py-2.5 text-xs bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-sans text-slate-900 dark:text-white focus:border-amber-500"
            />
            <Button
              type="submit"
              disabled={submitting}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-xs font-bold shrink-0 shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>Save Stash</span>
            </Button>
          </form>
        </div>

        {/* Stashes List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : stashes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No stashed changes saved for this workspace.
            </div>
          ) : (
            stashes.map((stash) => (
              <div
                key={stash._id}
                className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1f] border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {stash.message}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    <span>Branch: <strong className="text-emerald-400">{stash.branch}</strong></span>
                    <span>•</span>
                    <span>{stash.filesCount} files stashed</span>
                    <span>•</span>
                    <span>{new Date(stash.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePopStash(stash._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs transition-colors"
                    title="Apply stash and remove from list"
                  >
                    <RotateCcw size={13} />
                    <span>Pop</span>
                  </button>
                  <button
                    onClick={() => handleDropStash(stash._id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Drop stash permanently"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
