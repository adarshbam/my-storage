import apiClient from '../lib/apiClient';

export const getSystemConfig = () => apiClient.get('/system-config');
export const updateSystemConfig = (data) => apiClient.put('/system-config', data);
