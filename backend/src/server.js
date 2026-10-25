import http from 'node:http';
import app from './app.js';
import { env } from './config/env.js';
import { initSockets } from './sockets/index.js';
import { scheduleClosePlans } from './jobs/closePlans.js';

const server = http.createServer(app);
initSockets(server);
scheduleClosePlans();

server.listen(env.port, () => console.log(`STC backend listening on :${env.port}`));
