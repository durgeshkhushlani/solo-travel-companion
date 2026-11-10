import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initSockets } from './sockets/index.js';
import { scheduleClosePlans } from './jobs/closePlans.js';
import { systemClock } from './adapters/systemClock.js';
import { planRepository } from './repositories/plan.repository.js';
import { userRepository } from './repositories/user.repository.js';
import { bcryptHasher } from './adapters/bcryptHasher.js';
import { createAuthService } from './services/auth.service.js';

const auth = createAuthService({ users: userRepository, hasher: bcryptHasher });
const app = createApp({ auth });
const server = http.createServer(app);
initSockets(server);
scheduleClosePlans({ plans: planRepository, clock: systemClock });

server.listen(env.port, () => console.log(`STC backend listening on :${env.port}`));
