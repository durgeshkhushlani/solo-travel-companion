import { api } from './client.js';

export const getStats = () => api.get('/admin/stats').then((r) => r.data);
export const listUsers = () => api.get('/admin/users').then((r) => r.data);
export const setUserActive = (id, active) =>
  api.patch(`/admin/users/${id}`, { active }).then((r) => r.data);
export const listAdminPlans = () => api.get('/admin/plans').then((r) => r.data);
export const deleteAdminPlan = (id) => api.delete(`/admin/plans/${id}`).then((r) => r.data);
