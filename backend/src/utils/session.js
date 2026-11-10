import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { COOKIE_NAME } from '../middleware/auth.js';
import { CSRF_COOKIE } from '../middleware/csrf.js';

// Starts a Session: the JWT in an httpOnly cookie plus a readable csrf cookie that
// both live exactly as long as the token does.
export function startSession(res, user) {
  const token = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  const maxAge = jwt.decode(token).exp * 1000 - Date.now();
  const base = { sameSite: 'lax', secure: env.cookieSecure, maxAge };

  res.cookie(COOKIE_NAME, token, { ...base, httpOnly: true });
  res.cookie(CSRF_COOKIE, randomBytes(24).toString('hex'), { ...base, httpOnly: false });
}

export function endSession(res) {
  res.clearCookie(COOKIE_NAME);
  res.clearCookie(CSRF_COOKIE);
}
