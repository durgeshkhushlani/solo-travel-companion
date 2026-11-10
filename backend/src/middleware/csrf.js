import { timingSafeEqual } from 'node:crypto';

export const CSRF_COOKIE = 'stc_csrf';

// Double-submit cookie: a state-changing request must repeat the csrf cookie in a header.
// Login and register start a Session, so there is no cookie to forge yet and they are exempt.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/auth/login', '/auth/register']);

function sameToken(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get('x-csrf-token');
  if (!cookie || !header || !sameToken(cookie, header)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}
