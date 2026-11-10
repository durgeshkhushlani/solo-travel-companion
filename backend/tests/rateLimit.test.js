import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from '../src/middleware/rateLimit.js';

const MINUTE = 60_000;

function setup({ max = 2, windowMs = 10 * MINUTE } = {}) {
  let now = new Date('2027-01-01T10:00:00Z').getTime();
  const clock = { now: () => new Date(now) };
  const middleware = rateLimit({ max, windowMs, clock });
  const hit = (userId) => {
    const next = vi.fn();
    middleware({ user: { id: userId } }, {}, next);
    return next.mock.calls[0]?.[0];
  };
  return { hit, advance: (ms) => (now += ms) };
}

describe('rateLimit', () => {
  it('lets_requests_through_up_to_the_limit_then_answers_429', () => {
    const { hit } = setup({ max: 2 });

    expect(hit('u1')).toBeUndefined();
    expect(hit('u1')).toBeUndefined();
    expect(hit('u1')).toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  });

  it('counts_each_user_separately', () => {
    const { hit } = setup({ max: 1 });

    hit('u1');

    expect(hit('u2')).toBeUndefined();
  });

  it.each([
    ['just before the window ends', 10 * MINUTE - 1, 429],
    ['exactly when the window ends', 10 * MINUTE, undefined],
  ])('%s', (_label, elapsed, expectedStatus) => {
    const { hit, advance } = setup({ max: 1, windowMs: 10 * MINUTE });
    hit('u1');

    advance(elapsed);

    expect(hit('u1')?.status).toBe(expectedStatus);
  });
});
