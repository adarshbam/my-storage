import apiClient from '../lib/apiClient';

export const getSharedDrives = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/share/drives${query ? `?${query}` : ''}`);
};

export const createShare = (data) => apiClient.post('/share', data);
export const getShareLink = (id) => apiClient.get(`/share/${id}`);
export const revokeShare = (id) => apiClient.delete(`/share/${id}`);
