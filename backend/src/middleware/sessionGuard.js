import { COOKIE_NAME, verifySessionToken } from './auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { endSession } from '../utils/session.js';

const OPEN_PATHS = new Set(['/auth/login', '/auth/register', '/auth/logout']);

// Account Deactivation must cut off a Session that is already open, not only new logins.
// A request whose valid token belongs to a missing or deactivated User is refused and its
// cookies are cleared. Requests without a token pass on to requireAuth.
export const activeSession = (users) =>
  asyncHandler(async (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    const session = token && !OPEN_PATHS.has(req.path) ? verifySessionToken(token) : null;
    if (!session) return next();
    const user = await users.findById(session.id);
    if (user?.active) return next();
    endSession(res);
    res.status(401).json({ error: 'This account is not active' });
  });
