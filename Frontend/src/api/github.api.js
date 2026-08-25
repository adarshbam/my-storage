import apiClient from '../lib/apiClient';

// ==========================================
// REPOSITORIES
// ==========================================

export const getRepositories = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories${query ? `?${query}` : ''}`);
};

export const createRepository = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories${query ? `?${query}` : ''}`, data);
};

export const deleteRepository = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.delete(`/github/repositories/${owner}/${repo}${query ? `?${query}` : ''}`);
};

export const getRepoDetails = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}${query ? `?${query}` : ''}`);
};

export const getRepoContents = (owner, repo, path = '', params = {}) => {
  const query = new URLSearchParams(params).toString();
  const contentPath = path ? `/${path}` : '';
  return apiClient.get(`/github/repositories/${owner}/${repo}/contents${contentPath}${query ? `?${query}` : ''}`);
};

export const searchRepo = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/search?${query}`);
};

// ==========================================
// BRANCHES & COMPARISON
// ==========================================

export const getRepoBranches = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/branches${query ? `?${query}` : ''}`);
};

export const createBranch = (owner, repo, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/branches${query ? `?${query}` : ''}`, data);
};

export const deleteBranch = (owner, repo, branch, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.delete(`/github/repositories/${owner}/${repo}/branches/${encodeURIComponent(branch)}${query ? `?${query}` : ''}`);
};

export const compareBranches = (owner, repo, base, head, params = {}) => {
  const allParams = { base, head, ...params };
  const query = new URLSearchParams(allParams).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/compare?${query}`);
};

// ==========================================
// COMMITS & HISTORY
// ==========================================

export const getCommits = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/commits${query ? `?${query}` : ''}`);
};

export const getCommitDetails = (owner, repo, sha, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/commits/${sha}${query ? `?${query}` : ''}`);
};

export const getFileHistory = (owner, repo, path = '', params = {}) => {
  const query = new URLSearchParams(params).toString();
  const contentPath = path ? `/${path}` : '';
  return apiClient.get(`/github/repositories/${owner}/${repo}/file-history${contentPath}${query ? `?${query}` : ''}`);
};

export const getBlob = (owner, repo, sha, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/blob/${sha}${query ? `?${query}` : ''}`);
};

// ==========================================
// GIT OPERATIONS (RESTORE, REVERT, RESET, CHERRY-PICK, MERGE)
// ==========================================

export const restoreFile = (owner, repo, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/git/restore${query ? `?${query}` : ''}`, data);
};

export const revertCommit = (owner, repo, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/git/revert${query ? `?${query}` : ''}`, data);
};

export const resetBranch = (owner, repo, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/git/reset${query ? `?${query}` : ''}`, data);
};

export const cherryPickCommit = (owner, repo, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/git/cherry-pick${query ? `?${query}` : ''}`, data);
};

export const mergeBranches = (owner, repo, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/git/merge${query ? `?${query}` : ''}`, data);
};

// ==========================================
// PULL REQUESTS
// ==========================================

export const getPullRequests = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/pulls${query ? `?${query}` : ''}`);
};

export const createPullRequest = (owner, repo, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/pulls${query ? `?${query}` : ''}`, data);
};

export const getPullRequestDetails = (owner, repo, pullNumber, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/pulls/${pullNumber}${query ? `?${query}` : ''}`);
};

export const mergePullRequest = (owner, repo, pullNumber, data = {}, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.put(`/github/repositories/${owner}/${repo}/pulls/${pullNumber}/merge${query ? `?${query}` : ''}`, data);
};

export const updatePullRequest = (owner, repo, pullNumber, data = {}, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.patch(`/github/repositories/${owner}/${repo}/pulls/${pullNumber}${query ? `?${query}` : ''}`, data);
};

export const getPRReviews = (owner, repo, pullNumber, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/pulls/${pullNumber}/reviews${query ? `?${query}` : ''}`);
};

export const submitPRReview = (owner, repo, pullNumber, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/pulls/${pullNumber}/reviews${query ? `?${query}` : ''}`, data);
};

export const getPRComments = (owner, repo, pullNumber, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/pulls/${pullNumber}/comments${query ? `?${query}` : ''}`);
};

export const createPRComment = (owner, repo, pullNumber, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/pulls/${pullNumber}/comments${query ? `?${query}` : ''}`, data);
};

// ==========================================
// RELEASES & ASSETS (FEATURE 9)
// ==========================================

export const getReleases = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/releases${query ? `?${query}` : ''}`);
};

export const createRelease = (owner, repo, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/releases${query ? `?${query}` : ''}`, data);
};

export const deleteRelease = (owner, repo, releaseId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.delete(`/github/repositories/${owner}/${repo}/releases/${releaseId}${query ? `?${query}` : ''}`);
};

export const uploadReleaseAsset = (owner, repo, releaseId, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/releases/${releaseId}/assets${query ? `?${query}` : ''}`, data);
};

export const downloadReleaseAssetToVault = (owner, repo, assetId, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/releases/assets/${assetId}/download-to-vault${query ? `?${query}` : ''}`, data);
};

// ==========================================
// GITHUB ACTIONS & CI/CD (FEATURE 10)
// ==========================================

export const getWorkflows = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/actions/workflows${query ? `?${query}` : ''}`);
};

export const getWorkflowRuns = (owner, repo, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/actions/runs${query ? `?${query}` : ''}`);
};

export const dispatchWorkflow = (owner, repo, workflowId, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/actions/workflows/${workflowId}/dispatches${query ? `?${query}` : ''}`, data);
};

export const getWorkflowArtifacts = (owner, repo, runId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/github/repositories/${owner}/${repo}/actions/runs/${runId}/artifacts${query ? `?${query}` : ''}`);
};

export const importWorkflowArtifactToVault = (owner, repo, artifactId, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/github/repositories/${owner}/${repo}/actions/artifacts/${artifactId}/import-to-vault${query ? `?${query}` : ''}`, data);
};

