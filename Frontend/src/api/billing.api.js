import apiClient from '../lib/apiClient';

export const getCurrentSubscription = () => apiClient.get('/subscriptions/current');
export const getActivePlans = () => apiClient.get('/plan/get-active-plans');
export const getInvoices = () => apiClient.get('/billing/invoices');
export const createSubscription = (data) => apiClient.post('/subscriptions/create-subscription', data);
export const pauseSubscription = (id) => apiClient.post(`/subscriptions/${id}/pause`);
export const resumeSubscription = (id) => apiClient.post(`/subscriptions/${id}/resume`);
export const cancelSubscription = (id, data) => apiClient.post(`/subscriptions/${id}/cancel`, data);
export const changePlan = (data) => apiClient.post('/subscriptions/change-plan', data);
