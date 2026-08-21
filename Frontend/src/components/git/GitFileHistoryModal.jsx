import { useState, useEffect } from "react";
import { getFileHistory, getBlob, restoreFile } from "../../api/github.api";
import GitSafetyModal from "./GitSafetyModal";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import {
  History,
  RotateCcw,
  Clock,
  User,
  FileCode,
  Loader2,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function GitFileHistoryModal({
  isOpen,
  onClose,
  owner,
  repo,
  filePath,
  selectedBranch,
  onFileRestored,
}) {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected revision
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [blobContent, setBlobContent] = useState("");
  const [loadingBlob, setLoadingBlob] = useState(false);

  // Restore state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && owner && repo && filePath) {
      setLoading(true);
      setError(null);
      setSelectedCommit(null);
      setBlobContent("");

      getFileHistory(owner, repo, filePath, { ref: selectedBranch })
        .then((res) => {
          const list = res.commits || [];
          setCommits(list);
          if (list.length > 0) {
            loadRevision(list[0]);
          }
        })
        .catch((err) => {
          console.error(err);
          setError(err.message || "Failed to load file history");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, owner, repo, filePath, selectedBranch]);

  const loadRevision = async (commit) => {
    setSelectedCommit(commit);
    setLoadingBlob(true);
    try {
      const res = await getBlob(owner, repo, commit.sha);
      setBlobContent(res.content || "");
    } catch (err) {
      console.error(err);
      setBlobContent("Failed to load historical content for this revision.");
    } finally {
      setLoadingBlob(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!selectedCommit) return;
    setRestoring(true);
    try {
      const res = await restoreFile(owner, repo, {
        path: filePath,
        commitSha: selectedCommit.sha,
        branch: selectedBranch,
      });
      alert(res.message || "File version restored successfully");
      setShowRestoreModal(false);
      if (onFileRestored) onFileRestored();
      onClose();
    } catch (err) {
      alert(err.message || "Failed to restore file version");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <History size={18} className="text-accent-primary" />
            <span className="truncate">File History: {filePath?.split("/").pop()}</span>
          </div>
        }
        className="max-w-5xl"
      >
        <div className="space-y-4 pt-1">
          {/* Header Info */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/5 text-xs">
            <div className="flex items-center gap-2 font-mono truncate">
              <FileCode size={16} className="text-accent-primary shrink-0" />
              <span className="text-slate-700 dark:text-white font-bold truncate">{filePath}</span>
            </div>
            {selectedBranch && (
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent-soft text-accent-primary border border-accent-border font-bold shrink-0">
                {selectedBranch}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 size={32} className="animate-spin text-accent-primary mx-auto mb-2" />
              <p className="text-xs font-mono">Fetching file revisions...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[60vh]">
              {/* Revision Timeline list */}
              <div className="md:col-span-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2">
                  Revisions ({commits.length})
                </div>

                {commits.map((c, idx) => {
                  const isSelected = selectedCommit?.sha === c.sha;
                  return (
                    <div
                      key={c.sha}
                      onClick={() => loadRevision(c)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                        isSelected
                          ? "bg-accent-soft/30 border-accent-primary ring-2 ring-accent-primary/40 shadow-sm"
                          : "bg-white dark:bg-[#141416] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-500 dark:text-white/50">
                          {c.shortSha}
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {c.message}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-white/40 flex items-center gap-1">
                        <Clock size={10} />
                        <span>{new Date(c.author?.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Revision Code Viewer */}
              <div className="md:col-span-2 flex flex-col rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 overflow-hidden shadow-inner">
                {/* Revision Top Bar */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#1c1c1f] border-b border-slate-200 dark:border-white/5">
                  <div className="text-xs">
                    <span className="text-slate-500 dark:text-white/50">Viewing version: </span>
                    <strong className="font-mono text-slate-800 dark:text-white">
                      {selectedCommit?.shortSha || "None"}
                    </strong>
                  </div>

                  {selectedCommit && (
                    <Button
                      size="sm"
                      onClick={() => setShowRestoreModal(true)}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <RotateCcw size={13} /> Restore this Version
                    </Button>
                  )}
                </div>

                {/* Code Content */}
                <div className="flex-1 p-4 overflow-auto custom-scrollbar font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre bg-slate-50/50 dark:bg-black/30">
                  {loadingBlob ? (
                    <div className="p-12 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin text-accent-primary mx-auto mb-2" />
                      <p className="text-xs">Loading historical file snapshot...</p>
                    </div>
                  ) : (
                    blobContent || "(Empty file content)"
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Restore Version Confirmation */}
      {showRestoreModal && (
        <GitSafetyModal
          isOpen={true}
          onClose={() => setShowRestoreModal(false)}
          onConfirm={handleRestoreConfirm}
          severity="yellow"
          title={`Restore '${filePath?.split("/").pop()}' to ${selectedCommit?.shortSha}`}
          description={`Restoring will create a new commit on '${selectedBranch}' replacing the current contents of '${filePath}' with the version from commit ${selectedCommit?.shortSha}.`}
          impactDetails={[
            `Branch '${selectedBranch}' will receive a new restore commit`,
            `No other files in the repository will be modified`,
          ]}
          confirmText="Restore File"
          loading={restoring}
        />
      )}
    </>
  );
}
