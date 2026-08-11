import apiClient from '../lib/apiClient';

export const getDriveFiles = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/drive/files${query ? `?${query}` : ''}`);
};

export const getDriveFolder = (folderId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/drive/folder/${folderId}${query ? `?${query}` : ''}`);
};

export const searchDriveFiles = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/drive/search?${query}`);
};
