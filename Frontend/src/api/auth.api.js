import apiClient from '../lib/apiClient';

export const getSession = () => apiClient.get('/user');
export const login = (data) => apiClient.post('/user/login', data);
export const register = (data) => apiClient.post('/user/register', data);
export const authGoogle = (data) => apiClient.post('/user/auth/google', data);
export const logout = () => apiClient.post('/user/logout');
export const logoutAllDevices = () => apiClient.post('/user/logout-all');
export const forgotPassword = (data) => apiClient.post('/user/auth/forgot-password', data);
export const resetPassword = (data) => apiClient.post('/user/auth/reset-password', data);
export const sendOtp = (data) => apiClient.post('/otp/send', data);
export const verifyOtp = (data) => apiClient.post('/otp/verify', data);
