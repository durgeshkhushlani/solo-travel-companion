import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};
