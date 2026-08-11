import apiClient from '../lib/apiClient';

export const getOwnerSettings = () => apiClient.get('/owner-settings');
export const updateOwnerSettings = (data) => apiClient.put('/owner-settings', data);
