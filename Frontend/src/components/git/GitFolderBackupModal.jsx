import { useState, useEffect } from "react";
import {
  FolderSync,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ExternalLink,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import {
  configureFolderBackup,
  runFolderBackupSync,
} from "../../api/gitWorkspace.api";
import { getRepositories } from "../../api/github.api";
import Button from "../ui/Button";

export default function GitFolderBackupModal({
  isOpen,
  onClose,
  directory,
  onSyncCompleted,
}) {
  const [repositories, setRepositories] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [customRepo, setCustomRepo] = useState("");
  const [targetBranch, setTargetBranch] = useState("vault-backup");
  const [frequency, setFrequency] = useState("manual");
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRepos();
      if (directory?.gitSync) {
        const repoStr = `${directory.gitSync.repoOwner}/${directory.gitSync.repoName}`;
        setSelectedRepo(repoStr);
        setTargetBranch(directory.gitSync.targetBranch || "vault-backup");
      }
    }
  }, [isOpen, directory]);

  const fetchRepos = async () => {
    try {
      setLoadingRepos(true);
      const res = await getRepositories();
      setRepositories(res.directories || []);
    } catch (err) {
      console.error("Error loading repositories:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  if (!isOpen || !directory) return null;

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const finalRepo = selectedRepo === "__custom__" ? customRepo : selectedRepo;
    if (!finalRepo) {
      alert("Please select or enter a target GitHub repository");
      return;
    }

    const parts = finalRepo.split("/");
    if (parts.length < 2) {
      alert("Please provide the full repository name in 'owner/repo' format");
      return;
    }

    try {
      setSubmitting(true);
      const res = await configureFolderBackup({
        directoryId: directory._id,
        repoOwner: parts[0].trim(),
        repoName: parts[1].trim(),
        targetBranch: targetBranch.trim(),
        frequency,
      });

      alert(res.message || "Auto-backup configured successfully!");
      if (onSyncCompleted) onSyncCompleted();
      onClose();
    } catch (err) {
      alert(err.message || "Failed to configure backup");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImmediateSync = async () => {
    const finalRepo = selectedRepo === "__custom__" ? customRepo : selectedRepo;
    if (!finalRepo) {
      alert("Please select or enter a target GitHub repository");
      return;
    }
    const parts = finalRepo.split("/");

    try {
      setSyncing(true);
      const res = await runFolderBackupSync({
        directoryId: directory._id,
        repoOwner: parts[0]?.trim(),
        repoName: parts[1]?.trim(),
        targetBranch: targetBranch.trim(),
      });
      alert(res.message || "Backup snapshot pushed to GitHub successfully!");
      if (onSyncCompleted) onSyncCompleted();
      onClose();
    } catch (err) {
      alert(err.message || "Backup sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <CloudUpload size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Automated GitHub Folder Backup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Snapshot & sync <strong>{directory.name}</strong> to a private GitHub repo
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

        {/* Content Form */}
        <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Target GitHub Repository
            </label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-cyan-500 cursor-pointer"
            >
              <option value="">-- Select a repository --</option>
              {repositories.map((r) => (
                <option key={r._id || r.githubPath} value={r.githubPath || `${r.name}`}>
                  {r.githubPath || r.name}
                </option>
              ))}
              <option value="__custom__">+ Enter custom owner/repo...</option>
            </select>
          </div>

          {selectedRepo === "__custom__" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Custom Repository (owner/repo)
              </label>
              <input
                type="text"
                value={customRepo}
                onChange={(e) => setCustomRepo(e.target.value)}
                placeholder="octocat/my-vault-backups"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-cyan-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Backup Branch
              </label>
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="vault-backup"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sync Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none text-slate-900 dark:text-white focus:border-cyan-500 cursor-pointer"
              >
                <option value="manual">Manual Snapshot</option>
                <option value="on_change">On File Mutation</option>
                <option value="daily">Daily Scheduled</option>
                <option value="weekly">Weekly Scheduled</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-600 dark:text-cyan-300 leading-relaxed">
            📁 Snapshots all files inside <strong>{directory.name}</strong> and publishes atomic backup commits to GitHub with automated changelogs.
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleImmediateSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin text-cyan-400" : ""} />
              <span>{syncing ? "Syncing..." : "Sync Now"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-cyan-500/20"
              >
                {submitting ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
