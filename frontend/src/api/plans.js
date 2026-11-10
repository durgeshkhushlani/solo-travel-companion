import { api } from './client.js';

export const listPlans = (params) => api.get('/plans', { params }).then((r) => r.data);
export const getPlan = (id) => api.get(`/plans/${id}`).then((r) => r.data);
export const createPlan = (body) => api.post('/plans', body).then((r) => r.data);
export const updatePlan = (id, body) => api.patch(`/plans/${id}`, body).then((r) => r.data);
export const deletePlan = (id) => api.delete(`/plans/${id}`).then((r) => r.data);
export const listCompanions = (id) => api.get(`/plans/${id}/companions`).then((r) => r.data);
export const leaveTrip = (id) => api.delete(`/plans/${id}/companions/me`).then((r) => r.data);
export const removeCompanion = (id, userId) =>
  api.delete(`/plans/${id}/companions/${userId}`).then((r) => r.data);
