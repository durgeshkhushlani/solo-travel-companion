import { api } from './client.js';

export const listFriends = () => api.get('/friends').then((r) => r.data);
export const listFriendRequests = () => api.get('/friends/requests').then((r) => r.data);
export const sendFriendRequest = (userId) =>
  api.post('/friends/requests', { userId }).then((r) => r.data);
export const acceptFriendRequest = (id) =>
  api.post(`/friends/requests/${id}/accept`).then((r) => r.data);
export const unfriend = (userId) => api.delete(`/friends/${userId}`).then((r) => r.data);
export const listBlocks = () => api.get('/friends/blocks').then((r) => r.data);
export const blockUser = (userId) => api.post('/friends/blocks', { userId }).then((r) => r.data);
export const unblockUser = (userId) =>
  api.delete(`/friends/blocks/${userId}`).then((r) => r.data);
