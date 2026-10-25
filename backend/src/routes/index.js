import { Router } from 'express';
import auth from './auth.routes.js';
import users from './users.routes.js';
import plans from './plans.routes.js';
import requests from './requests.routes.js';
import friends from './friends.routes.js';
import messages from './messages.routes.js';
import admin from './admin.routes.js';
import ai from './ai.routes.js';

const api = Router();
api.use('/auth', auth);
api.use('/users', users);
api.use('/plans', plans);
api.use('/requests', requests);
api.use('/friends', friends);
api.use('/messages', messages);
api.use('/admin', admin);
api.use('/ai', ai);

export default api;
