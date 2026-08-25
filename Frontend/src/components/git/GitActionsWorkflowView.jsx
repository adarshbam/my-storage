import { useState, useEffect } from "react";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Download,
  ExternalLink,
  Loader2,
  Workflow,
  Archive,
  User,
  GitBranch,
} from "lucide-react";
import {
  getWorkflows,
  getWorkflowRuns,
  dispatchWorkflow,
  getWorkflowArtifacts,
  importWorkflowArtifactToVault,
} from "../../api/github.api";
import Button from "../ui/Button";
import { formatSize } from "../../lib/utils";

export default function GitActionsWorkflowView({
  owner,
  repo,
  selectedBranch,
  onRefreshRepo,
}) {
  const [workflows, setWorkflows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchWorkflowTarget, setDispatchWorkflowTarget] = useState(null);
  const [dispatchBranch, setDispatchBranch] = useState(selectedBranch || "main");
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Artifacts state
  const [activeRunArtifacts, setActiveRunArtifacts] = useState({});
  const [loadingArtifacts, setLoadingArtifacts] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wfRes, runsRes] = await Promise.all([
        getWorkflows(owner, repo),
        getWorkflowRuns(owner, repo, {
          ...(selectedWorkflowId && { workflowId: selectedWorkflowId }),
        }),
      ]);
      setWorkflows(wfRes.workflows || []);
      setRuns(runsRes.workflow_runs || []);
    } catch (err) {
      console.error("Error loading GitHub Actions data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [owner, repo, selectedWorkflowId]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchWorkflowTarget) return;

    try {
      setSubmittingDispatch(true);
      const res = await dispatchWorkflow(owner, repo, dispatchWorkflowTarget.id, {
        ref: dispatchBranch.trim() || "main",
      });
      alert(res.message || "Workflow run dispatched successfully!");
      setShowDispatchModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to trigger workflow dispatch");
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const handleLoadArtifacts = async (runId) => {
    try {
      setLoadingArtifacts((prev) => ({ ...prev, [runId]: true }));
      const res = await getWorkflowArtifacts(owner, repo, runId);
      setActiveRunArtifacts((prev) => ({ ...prev, [runId]: res.artifacts || [] }));
    } catch (err) {
      console.error("Error loading artifacts:", err);
    } finally {
      setLoadingArtifacts((prev) => ({ ...prev, [runId]: false }));
    }
  };

  const handleImportArtifactToVault = async (artifact) => {
    try {
      const res = await importWorkflowArtifactToVault(owner, repo, artifact.id, {
        artifactName: artifact.name,
      });
      alert(res.message || "Artifact zip package imported into Vault successfully!");
    } catch (err) {
      alert(err.message || "Failed to import artifact into Vault");
    }
  };

  const getStatusBadge = (status, conclusion) => {
    if (status === "in_progress") {
      return (
        <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full text-[11px] font-bold">
          <RotateCw size={12} className="animate-spin" />
          In Progress
        </span>
      );
    }
    if (status === "queued") {
      return (
        <span className="flex items-center gap-1 text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full text-[11px] font-bold">
          <Clock size={12} />
          Queued
        </span>
      );
    }
    if (conclusion === "success") {
      return (
        <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px] font-bold">
          <CheckCircle2 size={12} />
          Passed
        </span>
      );
    }
    if (conclusion === "failure") {
      return (
        <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full text-[11px] font-bold">
          <XCircle size={12} />
          Failed
        </span>
      );
    }
    return (
      <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded-full text-[11px] font-bold">
        {conclusion || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/60 dark:bg-[#111113]/80 p-5 rounded-3xl border border-slate-200 dark:border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Workflow size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>GitHub Actions & CI/CD Pipelines</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitor build runs, trigger manual dispatches, and download CI artifacts into Vault
            </p>
          </div>
        </div>

        {/* Workflow Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedWorkflowId}
            onChange={(e) => setSelectedWorkflowId(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-sans text-slate-800 dark:text-white cursor-pointer"
          >
            <option value="">All Workflows</option>
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchData()}
            className="p-2 rounded-xl bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 transition-colors"
            title="Refresh runs"
          >
            <RotateCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Workflows Trigger Bar */}
      {workflows.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#141416]/50 border border-slate-200 dark:border-white/5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Available Workflows:
          </span>
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => {
                setDispatchWorkflowTarget(wf);
                setDispatchBranch(selectedBranch || "main");
                setShowDispatchModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs transition-colors"
            >
              <Play size={12} />
              <span>Run {wf.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Workflow Runs Timeline */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-cyan-400 mb-2" />
          <p className="text-xs">Loading workflow runs...</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="py-20 text-center bg-white/40 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl p-8">
          <Workflow size={48} className="mx-auto text-slate-400 mb-3 opacity-60" />
          <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            No Workflow Runs
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            No CI/CD executions found for this repository. Trigger a workflow to start.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="bg-white/80 dark:bg-[#141416]/80 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm backdrop-blur-md space-y-3 hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {getStatusBadge(run.status, run.conclusion)}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      #{run.run_number} {run.name}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-mono">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <GitBranch size={11} />
                        {run.head_branch}
                      </span>
                      <span>•</span>
                      <span>SHA: {run.head_sha?.substring(0, 7)}</span>
                      <span>•</span>
                      <span>{new Date(run.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadArtifacts(run.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5 text-xs font-semibold transition-colors"
                    title="Inspect CI build artifacts"
                  >
                    <Archive size={13} className="text-cyan-400" />
                    <span>Artifacts</span>
                  </button>
                  <a
                    href={run.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    title="View logs on GitHub"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Artifacts Drawer */}
              {activeRunArtifacts[run.id] && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 space-y-2 animate-in fade-in">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Generated Build Artifacts ({activeRunArtifacts[run.id].length}):
                  </span>
                  {activeRunArtifacts[run.id].length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No artifacts produced in this run.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeRunArtifacts[run.id].map((art) => (
                        <div
                          key={art.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1c1c1f] border border-slate-200 dark:border-white/5 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                              {art.name}.zip
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatSize(art.size_in_bytes)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleImportArtifactToVault(art)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[11px] transition-colors shrink-0"
                            title="Import zip artifact to Vault"
                          >
                            <Download size={12} />
                            <span>Save to Vault</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Workflow Modal */}
      {showDispatchModal && dispatchWorkflowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Play size={18} className="text-cyan-400" />
              <span>Run Workflow: {dispatchWorkflowTarget.name}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trigger a manual <code>workflow_dispatch</code> execution on GitHub.
            </p>

            <form onSubmit={handleDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Branch
                </label>
                <input
                  type="text"
                  value={dispatchBranch}
                  onChange={(e) => setDispatchBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl outline-none font-mono text-slate-900 dark:text-white focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={submittingDispatch || !dispatchBranch.trim()}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-cyan-500/20"
                >
                  {submittingDispatch ? "Dispatching..." : "Run Workflow"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
