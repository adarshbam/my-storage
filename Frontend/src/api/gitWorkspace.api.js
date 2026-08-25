import apiClient from '../lib/apiClient';

// 1. Clone repository to Vault workspace
export const cloneRepoToVault = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/clone${query ? `?${query}` : ''}`, data);
};

// 2. Get workspace status (working tree tracker)
export const getWorkspaceStatus = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/git-workspace/status${query ? `?${query}` : ''}`);
};

// 3. Stage files
export const stageFiles = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/stage${query ? `?${query}` : ''}`, data);
};

// 4. Unstage files
export const unstageFiles = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/unstage${query ? `?${query}` : ''}`, data);
};

// 5. Commit workspace (multi-file atomic commit)
export const commitWorkspace = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/commit${query ? `?${query}` : ''}`, data);
};

// 6. Pull remote changes
export const pullRemoteChanges = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/pull${query ? `?${query}` : ''}`, data);
};

// 7. Switch branch
export const switchWorkspaceBranch = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/branch/switch${query ? `?${query}` : ''}`, data);
};

// 8. Stash operations
export const stashChanges = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/stash${query ? `?${query}` : ''}`, data);
};

export const getStashes = (workspaceId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/git-workspace/stash/${workspaceId}${query ? `?${query}` : ''}`);
};

export const popStash = (stashId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/stash/${stashId}/pop${query ? `?${query}` : ''}`);
};

export const dropStash = (stashId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.delete(`/git-workspace/stash/${stashId}${query ? `?${query}` : ''}`);
};

// 9. Automated folder backup
export const configureFolderBackup = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/backup/configure${query ? `?${query}` : ''}`, data);
};

export const runFolderBackupSync = (data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.post(`/git-workspace/backup/sync${query ? `?${query}` : ''}`, data);
};
