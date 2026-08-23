import apiClient from '../lib/apiClient';

export const getDirectoryContents = (dirId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = dirId ? `/directory/${dirId}` : '/directory';
  return apiClient.get(query ? `${url}?${query}` : url);
};

export const createDirectory = (parentDirId, data) => 
  apiClient.post(parentDirId ? `/directory/${parentDirId}` : '/directory', data);

export const renameDirectory = (dirId, data) => apiClient.patch(`/directory/${dirId}`, data);
export const deleteDirectory = (dirId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.delete(`/directory/${dirId}${query ? `?${query}` : ''}`);
};

export const moveItems = (targetDirId, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = targetDirId ? `/directory/${targetDirId}/move` : '/directory/move';
  return apiClient.patch(query ? `${url}?${query}` : url, data);
};

export const copyItems = (targetDirId, data, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = targetDirId ? `/directory/${targetDirId}/copy` : '/directory/copy';
  return apiClient.post(query ? `${url}?${query}` : url, data);
};

export const batchDelete = (data) => apiClient.post('/directory/delete-batch', data);

export const searchFiles = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/file/search?${query}`);
};

export const getFileById = (fileId, options = {}) => apiClient.stream(`/file/${fileId}`, options);
export const markFileOpened = (fileId) => apiClient.post(`/file/${fileId}/opened`);
export const getFileCdnUrl = (fileId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/file/${fileId}/cdn-url${query ? `?${query}` : ''}`);
};
export const getThumbnail = (fileId) => apiClient.stream(`/file/${fileId}/thumbnail`);
export const getThumbnailCdnUrl = (fileId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/file/${fileId}/thumbnail/cdn-url${query ? `?${query}` : ''}`);
};

export const uploadFile = (parentDirId, body, headers = {}) => 
  apiClient.stream(parentDirId ? `/file/${parentDirId}` : '/file', { method: 'POST', body, headers });

export const initiateVaultUpload = (data) => apiClient.post('/file/upload-vault/initiate', data);
export const completeVaultUpload = (data) => apiClient.post('/file/upload-vault/complete', data);
export const abortVaultUpload = (data) => apiClient.post('/file/upload-vault/abort', data);
export const initiateVaultMultipartUpload = (data) => apiClient.post('/file/upload-vault/multipart/initiate', data);
export const getVaultMultipartPartUrl = (data) => apiClient.post('/file/upload-vault/multipart/part-url', data);
export const completeVaultMultipartUpload = (data) => apiClient.post('/file/upload-vault/multipart/complete', data);
export const abortVaultMultipartUpload = (data) => apiClient.post('/file/upload-vault/multipart/abort', data);
export const renameFile = (fileId, data) => apiClient.patch(`/file/${fileId}`, data);
export const deleteFile = (fileId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.delete(`/file/${fileId}${query ? `?${query}` : ''}`);
};
export const saveFile = (fileId, body) => apiClient.put(`/file/${fileId}/save`, body);
export const toggleStar = (fileId) => apiClient.post(`/file/${fileId}/starred`);
export const getStarredItems = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/file/starred${query ? `?${query}` : ''}`);
};
export const getRecentItems = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/file/recent${query ? `?${query}` : ''}`);
};

export const getShareLinks = () => apiClient.get('/share/links');
export const createShareLink = (data) => apiClient.post('/share/link', data);
export const toggleShareLink = (linkId) => apiClient.patch(`/share/link/${linkId}/toggle`);
export const updateShareLink = (linkId, data) => apiClient.patch(`/share/link/${linkId}`, data);
export const revokeShareLink = (linkId) => apiClient.delete(`/share/link/${linkId}`);
export const getSharedDrives = () => apiClient.get('/share/drives');

