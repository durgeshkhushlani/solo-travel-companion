import { Router } from 'express';
import { csrfProtection } from '../middleware/csrf.js';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from './users.routes.js';
import { planRoutes } from './plans.routes.js';
import { requestRoutes } from './requests.routes.js';
import { friendRoutes } from './friends.routes.js';
import messages from './messages.routes.js';
import admin from './admin.routes.js';
import ai from './ai.routes.js';

export function buildApi({ auth, users, plans, requests, friends }) {
  const api = Router();
  api.use(csrfProtection);
  api.use('/auth', authRoutes(auth));
  api.use('/users', userRoutes({ users }));
  api.use('/plans', planRoutes({ plans, requests }));
  api.use('/requests', requestRoutes({ requests }));
  api.use('/friends', friendRoutes({ friends }));
  api.use('/messages', messages);
  api.use('/admin', admin);
  api.use('/ai', ai);
  return api;
}
