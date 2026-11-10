import { api } from './client.js';

export const generateItinerary = (body) => api.post('/ai/itinerary', body).then((r) => r.data);
export const getRecommendations = () => api.get('/ai/recommendations').then((r) => r.data);
export const getPlanMatches = (planId) =>
  api.get(`/ai/plans/${planId}/matches`).then((r) => r.data);
export const askAssistant = (messages) =>
  api.post('/ai/assistant', { messages }).then((r) => r.data);
