import { notFound } from '../domain/errors.js';

// Profile reads and edits. Only the owner edits; the route passes the Session's own id.
export function createUserService({ repos }) {
  return {
    async get(id) {
      const user = await repos.users.findById(id);
      if (!user || !user.active) throw notFound('User');
      return user;
    },

    async update(id, input) {
      const user = await repos.users.update(id, input);
      await repos.embeddings.clearUser(id);
      return user;
    },
  };
}
