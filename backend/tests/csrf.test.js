import { describe, it, expect, vi } from 'vitest';
import { csrfProtection } from '../src/middleware/csrf.js';

function run({ method = 'POST', path = '/plans', cookie, header }) {
  const req = {
    method,
    path,
    cookies: cookie === undefined ? {} : { stc_csrf: cookie },
    get: (name) => (name.toLowerCase() === 'x-csrf-token' ? header : undefined),
  };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();

  csrfProtection(req, res, next);

  return { res, next };
}

describe('csrfProtection', () => {
  it('lets_a_request_through_when_the_header_repeats_the_cookie', () => {
    const { next } = run({ cookie: 'abc123', header: 'abc123' });

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the header is missing', 'abc123', undefined],
    ['the header differs from the cookie', 'abc123', 'abc124'],
    ['the cookie is missing', undefined, 'abc123'],
    ['both are missing', undefined, undefined],
  ])('refuses_a_post_when_%s', (_label, cookie, header) => {
    const { res, next } = run({ cookie, header });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('does_not_check_%s_requests', (method) => {
    const { next } = run({ method });

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(['/auth/login', '/auth/register'])(
    'does_not_check_%s_because_no_session_exists_yet',
    (path) => {
      const { next } = run({ path });

      expect(next).toHaveBeenCalledTimes(1);
    },
  );
});
