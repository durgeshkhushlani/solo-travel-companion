import { DomainError } from '../domain/errors.js';

// Fixed-window limiter per signed-in user, kept in memory. It protects the Gemini quota from
// a runaway client; with one server process that is enough (YAGNI: no shared store).
export function rateLimit({ max, windowMs, clock }) {
  const windows = new Map();

  return (req, res, next) => {
    const now = clock.now().getTime();
    const current = windows.get(req.user.id);
    if (!current || now - current.start >= windowMs) {
      windows.set(req.user.id, { start: now, count: 1 });
      return next();
    }
    if (current.count >= max) {
      return next(new DomainError('RATE_LIMITED', 'Too many AI requests, try again later', 429));
    }
    current.count += 1;
    next();
  };
}
