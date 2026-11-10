import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { createServices } from './container.js';
import { initSockets } from './sockets/index.js';
import { scheduleClosePlans } from './jobs/closePlans.js';
import { systemClock } from './adapters/systemClock.js';
import { createGeminiClient } from './ai/gemini.js';
import { bcryptHasher } from './adapters/bcryptHasher.js';

// One Gemini client serves both ports. Without a key, AI calls answer 503 at call time.
const gemini = createGeminiClient({
  apiKey: env.geminiApiKey,
  model: env.geminiModel,
  embeddingModel: env.geminiEmbeddingModel,
});
const services = createServices({
  prisma,
  clock: systemClock,
  hasher: bcryptHasher,
  llm: gemini,
  embedder: gemini,
});
const app = createApp(services);
const server = http.createServer(app);
initSockets(server, { messages: services.messages, users: services.repos.users });
scheduleClosePlans({ plans: services.repos.plans, clock: systemClock });

server.listen(env.port, () => console.log(`STC backend listening on :${env.port}`));
