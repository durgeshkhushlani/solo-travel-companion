import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { bcryptHasher } from '../../src/adapters/bcryptHasher.js';
import { createServices } from '../../src/container.js';
import { TEST_DATABASE_URL } from './testDatabase.js';

export const prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Message", "Block", "Friendship", "Companion", "JoinRequest", "TravelPlan", "User" CASCADE',
  );
}

// The real app, real services and real Postgres, with a clock the test can move.
export function startApp({ now = '2027-02-20T10:00:00.000Z' } = {}) {
  const time = { current: new Date(now) };
  const clock = { now: () => new Date(time.current) };
  const services = createServices({ prisma, clock, hasher: bcryptHasher });
  return { app: createApp(services), services, time };
}

// A logged-in browser: keeps cookies and echoes the csrf cookie like the frontend does.
export async function signUp(app, name) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    password: 'longenough1',
  });
  const csrf = res.headers['set-cookie']
    .find((c) => c.startsWith('stc_csrf='))
    .split(';')[0]
    .split('=')[1];
  const withCsrf = (req) => req.set('x-csrf-token', csrf);
  return {
    id: res.body.user.id,
    name,
    get: (url) => agent.get(url),
    post: (url, body) => withCsrf(agent.post(url)).send(body),
    patch: (url, body) => withCsrf(agent.patch(url)).send(body),
    delete: (url) => withCsrf(agent.delete(url)),
  };
}

export const planInput = (overrides = {}) => ({
  title: 'Spiti in March',
  destination: 'Spiti',
  startDate: '2027-03-01T00:00:00.000Z',
  endDate: '2027-03-07T00:00:00.000Z',
  interests: ['trekking'],
  maxCompanions: 2,
  ...overrides,
});
