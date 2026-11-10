import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { createServices } from './container.js';
import { initSockets } from './sockets/index.js';
import { scheduleClosePlans } from './jobs/closePlans.js';
import { systemClock } from './adapters/systemClock.js';
import { bcryptHasher } from './adapters/bcryptHasher.js';

const services = createServices({ prisma, clock: systemClock, hasher: bcryptHasher });
const app = createApp(services);
const server = http.createServer(app);
initSockets(server);
scheduleClosePlans({ plans: services.repos.plans, clock: systemClock });

server.listen(env.port, () => console.log(`STC backend listening on :${env.port}`));
