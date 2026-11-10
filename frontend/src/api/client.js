import axios from 'axios';
import { API_URL } from './config.js';

// Cookie-based auth: send credentials and echo the CSRF cookie as a header.
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const pair = document.cookie.split('; ').find((c) => c.startsWith('stc_csrf='));
  if (pair) config.headers['x-csrf-token'] = pair.split('=')[1];
  return config;
});
