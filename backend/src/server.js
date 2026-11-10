import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initSockets } from './sockets/index.js';
import { scheduleClosePlans } from './jobs/closePlans.js';
import { systemClock } from './adapters/systemClock.js';
import { planRepository } from './repositories/plan.repository.js';

const app = createApp({});
const server = http.createServer(app);
initSockets(server);
scheduleClosePlans({ plans: planRepository, clock: systemClock });

server.listen(env.port, () => console.log(`STC backend listening on :${env.port}`));
