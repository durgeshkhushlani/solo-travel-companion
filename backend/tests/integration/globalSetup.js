import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './testDatabase.js';

// Applies every migration to the test database before the first integration test.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
