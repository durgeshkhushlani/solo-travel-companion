import 'dotenv/config';
import { assertProductionConfig } from './assertProductionConfig.js';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // Gemini. Model names are configuration, not code, so they can follow Google's releases.
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
};

assertProductionConfig({
  nodeEnv: env.nodeEnv,
  jwtSecretFromEnv: Boolean(process.env.JWT_SECRET),
  cookieSecure: env.cookieSecure,
});
