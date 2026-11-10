import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'stc_token';

// The Session payload { id, role } for a valid token, or null. Shared by HTTP and sockets.
export function verifySessionToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const session = verifySessionToken(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
  req.user = session;
  next();
}
