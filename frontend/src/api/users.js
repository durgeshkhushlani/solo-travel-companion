import { api } from './client.js';

export const getUser = (id) => api.get(`/users/${id}`).then((r) => r.data);
export const updateMe = (body) => api.patch('/users/me', body).then((r) => r.data);
