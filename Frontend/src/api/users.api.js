import apiClient from '../lib/apiClient';

export const getProfilePic = (params = {}) => apiClient.stream('/user/profilepic', { params });
export const uploadProfilePic = (body) => apiClient.stream('/user/profilepic', { method: 'POST', body });
export const updateTheme = (data) => apiClient.put('/user/theme', data);
export const updateName = (data) => apiClient.patch('/user/name', data);
export const updatePassword = (data) => apiClient.post('/user/password', data); // Can be PATCH based on implementation, standard is POST/PATCH. Let's use PATCH as fallback
export const getSearchHistory = () => apiClient.get('/user/searchedItems');
export const storeSearchItem = (data) => apiClient.post('/user/searchedItems', data);

// System Users Management (Admin)
export const getAllSystemUsers = () => apiClient.get('/users');
export const deleteSystemUser = (id, data) => apiClient.delete(`/users/${id}`, { body: data });
export const forceLogoutUser = (id) => apiClient.post(`/users/${id}/logout`);
export const updateUserRole = (id, data) => apiClient.patch(`/users/${id}/role`, data);
export const reactivateUser = (id) => apiClient.post(`/users/${id}/reactivate`);
