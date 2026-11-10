import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { activeSession } from '../src/middleware/sessionGuard.js';
import { COOKIE_NAME } from '../src/middleware/auth.js';
import { env } from '../src/config/env.js';

const tokenFor = (id) => jwt.sign({ id, role: 'USER' }, env.jwtSecret);

async function run({ user, token = tokenFor('u1'), path = '/plans' }) {
  const users = { findById: vi.fn().mockResolvedValue(user) };
  const req = { path, cookies: token ? { [COOKIE_NAME]: token } : {} };
  const res = { clearCookie: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  activeSession(users)(req, res, next);
  await vi.waitFor(() => expect(next.mock.calls.length + res.json.mock.calls.length).toBe(1));
  return { users, res, next };
}

describe('activeSession', () => {
  it('lets_a_request_through_when_the_user_is_active', async () => {
    const { next, res } = await run({ user: { id: 'u1', active: true } });

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([
    ['deactivated', { id: 'u1', active: false }],
    ['deleted', null],
  ])('refuses_a_valid_token_of_a_%s_user_and_clears_the_cookies', async (_label, user) => {
    const { next, res } = await run({ user });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('passes_requests_without_a_token_on_to_requireAuth', async () => {
    const { next, users } = await run({ user: null, token: null });

    expect(next).toHaveBeenCalledOnce();
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('does_not_look_up_the_user_on_login', async () => {
    const { next, users } = await run({ user: null, path: '/auth/login' });

    expect(next).toHaveBeenCalledOnce();
    expect(users.findById).not.toHaveBeenCalled();
  });
});
