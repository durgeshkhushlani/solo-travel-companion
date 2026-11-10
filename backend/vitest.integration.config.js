import { defineConfig } from 'vitest/config';

// Integration tests run against a real Postgres (see docs/TESTING_SETUP in the report or
// TEST_DATABASE_URL). One file at a time because they share one database.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.int.test.js'],
    globalSetup: ['tests/integration/globalSetup.js'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
