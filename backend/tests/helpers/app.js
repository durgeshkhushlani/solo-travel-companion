import { createApp } from '../../src/app.js';
import { createAuthService } from '../../src/services/auth.service.js';
import { createFakeUsers, fakeHasher } from './fakes.js';

// The real Express app wired to in-memory fakes: no database, no bcrypt.
export function buildTestApp({ users = createFakeUsers() } = {}) {
  const auth = createAuthService({ users, hasher: fakeHasher });
  return { app: createApp({ auth }), users };
}
