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

// ── TWO-FACTOR AUTHENTICATION (TOTP 2FA) ──
export const setupTwoFactor = () => apiClient.post('/user/2fa/setup');
export const verifyTwoFactorSetup = (data) => apiClient.post('/user/2fa/verify-setup', data);
export const verifyTwoFactorLogin = (data) => apiClient.post('/user/2fa/verify-login', data);
export const disableTwoFactor = (data) => apiClient.post('/user/2fa/disable', data);
export const regenerateRecoveryCodes = (data) => apiClient.post('/user/2fa/recovery-codes/regenerate', data);

// ── PHONE VERIFICATION ──
export const sendPhoneOtp = (data) => apiClient.post('/user/phone/send-otp', data);
export const verifyPhoneOtp = (data) => apiClient.post('/user/phone/verify-otp', data);
export const checkPhoneTrialEligibility = (params) => apiClient.get('/user/phone/trial-eligibility', { params });

// ── SECONDARY RECOVERY EMAIL ──
export const sendSecondaryRecoveryEmailOtp = (data) => apiClient.post('/user/secondary-recovery-email/send-otp', data);
export const verifySecondaryRecoveryEmailOtp = (data) => apiClient.post('/user/secondary-recovery-email/verify-otp', data);
export const removeSecondaryRecoveryEmail = () => apiClient.delete('/user/secondary-recovery-email');
