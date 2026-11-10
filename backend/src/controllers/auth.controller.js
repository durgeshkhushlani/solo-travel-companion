import { toUserDto } from '../utils/dto.js';
import { endSession, startSession } from '../utils/session.js';

// Thin HTTP layer: read the request, call the service, shape the response.
export function createAuthController(auth) {
  return {
    async register(req, res) {
      const user = await auth.register(req.body);
      startSession(res, user);
      res.status(201).json({ user: toUserDto(user, user) });
    },

    async login(req, res) {
      const user = await auth.login(req.body);
      startSession(res, user);
      res.json({ user: toUserDto(user, user) });
    },

    logout(req, res) {
      endSession(res);
      res.status(204).end();
    },

    async me(req, res) {
      const user = await auth.currentUser(req.user.id);
      if (!user) return res.status(401).json({ error: 'Not authenticated' });
      res.json({ user: toUserDto(user, user) });
    },
  };
}
