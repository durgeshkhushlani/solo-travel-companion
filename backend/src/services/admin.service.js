import { assertCanChangeActive } from '../domain/admin.js';
import { notFound } from '../domain/errors.js';
import { toPlanDto, toUserDto } from '../utils/dto.js';

const EVERYTHING = { q: undefined, interest: [], hideEnded: false, openOnly: false };
const ADMIN_PAGE = { page: 1, pageSize: 200 };

// Admin Panel use cases: Platform Stats, Account Deactivation and Moderation. The route layer
// has already required role ADMIN; the actor is passed in for the self-protection rule.
export function createAdminService({ repos, clock }) {
  return {
    stats: () => repos.admin.stats(),

    async users(viewer) {
      const users = await repos.users.list();
      return users.map((u) => ({ ...toUserDto(u, viewer), active: u.active }));
    },

    async setActive(actor, userId, active) {
      assertCanChangeActive(actor.id, userId, active);
      const user = await repos.users.findById(userId);
      if (!user) throw notFound('User');
      const updated = await repos.users.update(userId, { active });
      return { ...toUserDto(updated, actor), active: updated.active };
    },

    async plans() {
      const now = clock.now();
      const { items } = await repos.plans.search({ ...EVERYTHING, now }, ADMIN_PAGE);
      return items.map((p) => toPlanDto(p, now));
    },

    // Moderation: remove a Travel Plan.
    async removePlan(planId) {
      if (!(await repos.plans.findById(planId))) throw notFound('Travel Plan');
      await repos.plans.remove(planId);
    },
  };
}
