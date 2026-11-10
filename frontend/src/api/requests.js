import { api } from './client.js';

export const sendJoinRequest = (planId) =>
  api.post(`/plans/${planId}/requests`).then((r) => r.data);
export const listPlanRequests = (planId) =>
  api.get(`/plans/${planId}/requests`).then((r) => r.data);
export const listMyRequests = () => api.get('/requests/mine').then((r) => r.data);
export const acceptRequest = (id) => api.post(`/requests/${id}/accept`).then((r) => r.data);
export const rejectRequest = (id) => api.post(`/requests/${id}/reject`).then((r) => r.data);
export const cancelRequest = (id) => api.post(`/requests/${id}/cancel`).then((r) => r.data);
