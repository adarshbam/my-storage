import apiClient from '../lib/apiClient';

export const getTrashItems = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiClient.get(`/trash${query ? `?${query}` : ''}`);
};

export const restoreTrashItem = (id) => apiClient.post(`/trash/${id}/restore`);
export const emptyTrash = () => apiClient.delete('/trash');
export const deleteTrashItem = (id) => apiClient.delete(`/trash/${id}`);
