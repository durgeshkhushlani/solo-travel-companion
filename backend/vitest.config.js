import { defineConfig } from 'vitest/config';

// Fast unit tests only: no database, no network. Integration tests have their own config.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['tests/integration/**', 'node_modules/**'],
    coverage: { provider: 'v8', include: ['src/**'], reporter: ['text', 'html'] },
  },
});
