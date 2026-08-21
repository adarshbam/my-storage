import apiClient from '../lib/apiClient';

export const getCurrentSubscription = () => apiClient.get('/subscriptions/current');
export const getActivePlans = () => apiClient.get('/plan/get-active-plans');
export const getInvoices = () => apiClient.get('/billing/invoices');
export const createSubscription = (data) => apiClient.post('/subscriptions/create-subscription', data);
export const pauseSubscription = (id, data = {}) => apiClient.post(`/subscriptions/${id}/pause`, { subscriptionId: id, ...data });
export const resumeSubscription = (id, data = {}) => apiClient.post(`/subscriptions/${id}/resume`, { subscriptionId: id, ...data });
export const cancelSubscription = (id, data = {}) => apiClient.post(`/subscriptions/${id}/cancel`, { subscriptionId: id, cancelAtCycleEnd: true, ...data });
export const changePlan = (data) => apiClient.post('/subscriptions/change-plan', data);
