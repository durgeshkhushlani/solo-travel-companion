import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { buildApi } from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

// Builds the Express app from its collaborators so tests can pass fakes (Dependency Inversion).
// server.js is the composition root that passes the real ones.
export function createApp(deps) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', buildApi(deps));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
