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
export const getThumbnail = (fileId) => apiClient.stream(`/file/${fileId}/thumbnail`);

export const uploadFile = (parentDirId, body, headers = {}) => 
  apiClient.stream(parentDirId ? `/file/${parentDirId}` : '/file', { method: 'POST', body, headers });

export const initiateVaultUpload = (data) => apiClient.post('/file/upload-vault/initiate', data);
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
