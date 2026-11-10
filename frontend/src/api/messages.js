import { api } from './client.js';

export const listConversations = () => api.get('/messages/conversations').then((r) => r.data);
export const getHistory = (userId) => api.get(`/messages/${userId}`).then((r) => r.data);
export const markRead = (userId) => api.post(`/messages/${userId}/read`).then((r) => r.data);
