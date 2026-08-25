import { useState, useEffect } from "react";
import {
  FolderGit2,
  GitBranch,
  Loader2,
  X,
  CheckCircle2,
  FolderPlus,
} from "lucide-react";
import { cloneRepoToVault } from "../../api/gitWorkspace.api";
import { getRepositories, getRepoBranches } from "../../api/github.api";
import Button from "../ui/Button";

export default function GitCloneRepoModal({
  isOpen,
  onClose,
  preselectedRepo = null,
  destinationFolderId = null,
  onCloned,
}) {
  const [repositories, setRepositories] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState(
    preselectedRepo?.githubPath || preselectedRepo?.name || ""
  );
  const [customOwner, setCustomOwner] = useState(preselectedRepo?.owner || "");
  const [customRepo, setCustomRepo] = useState(preselectedRepo?.name || "");
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [folderName, setFolderName] = useState("");
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRepos();
      if (preselectedRepo) {
        const repoStr = preselectedRepo.githubPath || `${preselectedRepo.owner || ""}/${preselectedRepo.name}`;
        setSelectedRepo(repoStr);
        setFolderName(preselectedRepo.name || "");
        if (preselectedRepo.default_branch) {
          setSelectedBranch(preselectedRepo.default_branch);
        }
      }
    }
  }, [isOpen, preselectedRepo]);

  const fetchRepos = async () => {
    try {
      setLoadingRepos(true);
      const res = await getRepositories();
      setRepositories(res.directories || []);
    } catch (err) {
      console.error("Error loading repos for clone modal:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    if (selectedRepo && selectedRepo !== "__custom__") {
      const parts = selectedRepo.split("/");
      if (parts.length >= 2) {
        setFolderName(parts[1]);
        getRepoBranches(parts[0], parts[1])
          .then((res) => {
            setBranches(res.branches || []);
            if (res.defaultBranch) setSelectedBranch(res.defaultBranch);
          })
          .catch(() => {});
      }
    }
  }, [selectedRepo]);

  if (!isOpen) return null;

  const handleCloneSubmit = async (e) => {
    e.preventDefault();
    let owner = customOwner;
    let repo = customRepo;

    if (selectedRepo && selectedRepo !== "__custom__") {
      const parts = selectedRepo.split("/");
      owner = parts[0];
      repo = parts[1];
    }

    if (!owner || !repo) {
      alert("Please select or specify a GitHub repository to clone");
      return;
    }

    try {
      setCloning(true);
      const res = await cloneRepoToVault({
        owner: owner.trim(),
        repo: repo.trim(),
        branch: selectedBranch || undefined,
        destinationFolderId,
        folderName: folderName.trim() || repo.trim(),
      });

      alert(res.message || "Repository cloned into Vault successfully!");
      if (onCloned) onCloned(res);
      onClose();
    } catch (err) {
      alert(err.message || "Failed to clone repository into Vault");
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FolderGit2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Clone Repository to Vault
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mount as a Git-Tracked Workspace inside your Vault storage
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
        <form onSubmit={handleCloneSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Choose Repository
            </label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-emerald-500 cursor-pointer"
            >
              <option value="">-- Select a repository --</option>
              {repositories.map((r) => (
                <option key={r._id || r.githubPath} value={r.githubPath || `${r.name}`}>
                  {r.githubPath || r.name}
                </option>
              ))}
              <option value="__custom__">+ Enter custom repository...</option>
            </select>
          </div>

          {selectedRepo === "__custom__" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Owner / Org
                </label>
                <input
                  type="text"
                  value={customOwner}
                  onChange={(e) => setCustomOwner(e.target.value)}
                  placeholder="octocat"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={customRepo}
                  onChange={(e) => setCustomRepo(e.target.value)}
                  placeholder="Hello-World"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-emerald-500"
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Branch to Clone
              </label>
              {branches.length > 0 ? (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-emerald-500 cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-emerald-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vault Folder Name
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="my-workspace"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-xl outline-none text-slate-900 dark:text-white focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-300 leading-relaxed">
            ⚡ <strong>Vault Git Workspace</strong>: Downloads all repository files into your Vault storage with working tree tracking, live staging, branch switching, and direct multi-file push capabilities.
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={cloning}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              {cloning ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Cloning to Vault...</span>
                </>
              ) : (
                <>
                  <FolderGit2 size={15} />
                  <span>Clone to Vault</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
