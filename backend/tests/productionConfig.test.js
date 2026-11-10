import { describe, it, expect } from 'vitest';
import { assertProductionConfig } from '../src/config/assertProductionConfig.js';

const safe = { nodeEnv: 'production', jwtSecretFromEnv: true, cookieSecure: true };

describe('assertProductionConfig', () => {
  it('accepts_a_production_config_with_a_secret_and_secure_cookies', () => {
    expect(() => assertProductionConfig(safe)).not.toThrow();
  });

  it.each([
    ['no JWT_SECRET', { jwtSecretFromEnv: false }, /JWT_SECRET/],
    ['insecure cookies', { cookieSecure: false }, /COOKIE_SECURE/],
  ])('refuses_production_with_%s', (_label, change, message) => {
    expect(() => assertProductionConfig({ ...safe, ...change })).toThrow(message);
  });

  it('does_not_check_development_or_test', () => {
    expect(() =>
      assertProductionConfig({
        nodeEnv: 'development',
        jwtSecretFromEnv: false,
        cookieSecure: false,
      }),
    ).not.toThrow();
  });
});
