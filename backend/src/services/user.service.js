import { notFound } from '../domain/errors.js';

// Profile reads and edits. Only the owner edits; the route passes the Session's own id.
export function createUserService({ repos }) {
  return {
    async get(id) {
      const user = await repos.users.findById(id);
      if (!user || !user.active) throw notFound('User');
      return user;
    },

    update: (id, input) => repos.users.update(id, input),
  };
}
