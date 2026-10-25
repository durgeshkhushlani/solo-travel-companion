// Double-submit cookie CSRF protection. TODO: issue token on login, mount on /api.
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfProtection(req, res, next) {
  if (SAFE.has(req.method)) return next();
  const cookie = req.cookies?.stc_csrf;
  const header = req.get('x-csrf-token');
  if (!cookie || cookie !== header) return res.status(403).json({ error: 'Invalid CSRF token' });
  next();
}
