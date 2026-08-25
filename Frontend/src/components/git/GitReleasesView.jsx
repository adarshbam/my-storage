import { useState, useEffect } from "react";
import {
  Tag,
  Package,
  Plus,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Paperclip,
  CheckCircle2,
  Archive,
} from "lucide-react";
import {
  getReleases,
  createRelease,
  deleteRelease,
  uploadReleaseAsset,
  downloadReleaseAssetToVault,
} from "../../api/github.api";
import { getDirectoryContents } from "../../api/files.api";
import Button from "../ui/Button";
import { formatSize } from "../../lib/utils";

export default function GitReleasesView({
  owner,
  repo,
  selectedBranch,
  onRefreshRepo,
}) {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [activeReleaseForAsset, setActiveReleaseForAsset] = useState(null);

  // New release form state
  const [tagName, setTagName] = useState("");
  const [releaseTitle, setReleaseTitle] = useState("");
  const [releaseBody, setReleaseBody] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [isPrerelease, setIsPrerelease] = useState(false);
  const [submittingRelease, setSubmittingRelease] = useState(false);

  // Vault file picker state for attaching assets
  const [vaultFiles, setVaultFiles] = useState([]);
  const [loadingVaultFiles, setLoadingVaultFiles] = useState(false);
  const [selectedVaultFileId, setSelectedVaultFileId] = useState("");
  const [uploadingAsset, setUploadingAsset] = useState(false);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const res = await getReleases(owner, repo);
      setReleases(res.releases || []);
    } catch (err) {
      console.error("Error loading releases:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVaultFiles = async () => {
    try {
      setLoadingVaultFiles(true);
      const res = await getDirectoryContents("");
      setVaultFiles(res.files || []);
    } catch (err) {
      console.error("Error loading vault files:", err);
    } finally {
      setLoadingVaultFiles(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, [owner, repo]);

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    try {
      setSubmittingRelease(true);
      await createRelease(owner, repo, {
        tagName: tagName.trim(),
        name: releaseTitle.trim() || tagName.trim(),
        body: releaseBody,
        draft: isDraft,
        prerelease: isPrerelease,
        targetCommitish: selectedBranch || undefined,
      });

      alert(`Release '${tagName}' published successfully!`);
      setShowCreateModal(false);
      setTagName("");
      setReleaseTitle("");
      setReleaseBody("");
      fetchReleases();
      if (onRefreshRepo) onRefreshRepo();
    } catch (err) {
      alert(err.message || "Failed to create release");
    } finally {
      setSubmittingRelease(false);
    }
  };

  const handleDeleteRelease = async (releaseId) => {
    if (!window.confirm("Are you sure you want to delete this release from GitHub?")) return;
    try {
      await deleteRelease(owner, repo, releaseId);
      fetchReleases();
    } catch (err) {
      alert(err.message || "Failed to delete release");
    }
  };

  const handleAttachAsset = async (e) => {
    e.preventDefault();
    if (!activeReleaseForAsset || !selectedVaultFileId) return;

    try {
      setUploadingAsset(true);
      await uploadReleaseAsset(owner, repo, activeReleaseForAsset.id, {
        fileId: selectedVaultFileId,
      });

      alert("Vault asset uploaded to release successfully!");
      setShowAttachModal(false);
      setSelectedVaultFileId("");
      fetchReleases();
    } catch (err) {
      alert(err.message || "Failed to upload asset to release");
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleDownloadAssetToVault = async (asset) => {
    try {
      const res = await downloadReleaseAssetToVault(owner, repo, asset.id, {
        assetName: asset.name,
      });
      alert(res.message || "Release asset imported into Vault successfully!");
    } catch (err) {
      alert(err.message || "Failed to import asset into Vault");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/60 dark:bg-[#111113]/80 p-5 rounded-3xl border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Tag size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>GitHub Releases & Binary Asset Hub</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tag milestones, publish changelogs, and bundle Vault files as release binaries
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={15} />
          <span>Draft New Release</span>
        </button>
      </div>

      {/* Releases List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-purple-400 mb-2" />
          <p className="text-xs">Loading releases from GitHub...</p>
        </div>
      ) : releases.length === 0 ? (
        <div className="py-20 text-center bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-8">
          <Package size={48} className="mx-auto text-slate-400 mb-3 opacity-60" />
          <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            No Releases Found
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            There are no tags or releases published for this repository yet. Draft your first release above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {releases.map((release) => (
            <div
              key={release.id}
              className="bg-white/80 dark:bg-[#141416]/80 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm backdrop-blur-md space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                      <Tag size={12} />
                      {release.tag_name}
                    </span>
                    {release.prerelease && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                        Pre-release
                      </span>
                    )}
                    {release.draft && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-500/20 text-slate-400 text-[10px] font-bold">
                        Draft
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {release.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {new Date(release.published_at || release.created_at).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User size={13} />
                      {release.author?.login || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveReleaseForAsset(release);
                      fetchVaultFiles();
                      setShowAttachModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold transition-colors"
                    title="Attach binary asset from Vault"
                  >
                    <Paperclip size={13} />
                    <span>Attach Vault Asset</span>
                  </button>
                  <a
                    href={release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    title="View on GitHub"
                  >
                    <ExternalLink size={15} />
                  </a>
                  <button
                    onClick={() => handleDeleteRelease(release.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
                    title="Delete release"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Release Notes Body */}
              {release.body && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {release.body}
                </div>
              )}

              {/* Attached Assets */}
              {release.assets && release.assets.length > 0 && (
                <div className="pt-2">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Archive size={14} className="text-purple-400" />
                    <span>Release Binaries ({release.assets.length})</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {release.assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/5 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                            {asset.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatSize(asset.size)} • {asset.download_count} downloads
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownloadAssetToVault(asset)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[11px] transition-colors shrink-0"
                          title="Import release asset binary directly to Vault"
                        >
                          <Download size={13} />
                          <span>Save to Vault</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Release Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag size={18} className="text-purple-400" />
              <span>Draft New GitHub Release</span>
            </h3>

            <form onSubmit={handleCreateRelease} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tag Version <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="v1.0.0"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Release Title
                  </label>
                  <input
                    type="text"
                    value={releaseTitle}
                    onChange={(e) => setReleaseTitle(e.target.value)}
                    placeholder="Initial Launch Release"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none text-slate-900 dark:text-white focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Release Notes (Markdown)
                </label>
                <textarea
                  rows={4}
                  value={releaseBody}
                  onChange={(e) => setReleaseBody(e.target.value)}
                  placeholder="## What's Changed&#10;- Added Vault cloud integration&#10;- Performance optimizations"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none text-slate-900 dark:text-white focus:border-purple-500 resize-none font-mono"
                />
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrerelease}
                    onChange={(e) => setIsPrerelease(e.target.checked)}
                    className="rounded text-purple-500"
                  />
                  <span>Pre-release</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDraft}
                    onChange={(e) => setIsDraft(e.target.checked)}
                    className="rounded text-purple-500"
                  />
                  <span>Save as Draft</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={submittingRelease || !tagName.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-purple-600/20"
                >
                  {submittingRelease ? "Publishing..." : "Publish Release"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Vault Asset Modal */}
      {showAttachModal && activeReleaseForAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Paperclip size={18} className="text-purple-400" />
              <span>Attach File from Vault to Release</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a file from your Vault to upload directly as a binary asset for <strong>{activeReleaseForAsset.tag_name}</strong>.
            </p>

            <form onSubmit={handleAttachAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Choose Vault File
                </label>
                {loadingVaultFiles ? (
                  <div className="py-4 flex justify-center text-slate-400">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                ) : (
                  <select
                    value={selectedVaultFileId}
                    onChange={(e) => setSelectedVaultFileId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none text-slate-900 dark:text-white focus:border-purple-500 cursor-pointer"
                    required
                  >
                    <option value="">-- Choose a file from Vault --</option>
                    {vaultFiles.map((file) => (
                      <option key={file._id} value={file._id}>
                        {file.name} ({formatSize(file.size)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={uploadingAsset || !selectedVaultFileId}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-purple-600/20"
                >
                  {uploadingAsset ? "Uploading..." : "Upload Asset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
