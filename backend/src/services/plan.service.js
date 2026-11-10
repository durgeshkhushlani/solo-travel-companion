import {
  assertDatesOrdered,
  assertHost,
  assertLimitNotBelowAccepted,
  assertStartsInFuture,
  statusFor,
} from '../domain/plan.js';
import { PlanStatus } from '../domain/enums.js';
import { notFound } from '../domain/errors.js';
import { toPlanDto } from '../utils/dto.js';

// Travel Plan use cases. Rules come from the domain; storage and time are injected.
// Writes run inside the unit of work so the plan row is locked while it is changed.
export function createPlanService({ repos, uow, clock }) {
  const mustFind = async (plans, id, lock = false) => {
    const plan = await (lock ? plans.findByIdForUpdate(id) : plans.findById(id));
    if (!plan) throw notFound('Travel Plan');
    return plan;
  };

  return {
    async create(hostId, input) {
      assertDatesOrdered(input.startDate, input.endDate);
      assertStartsInFuture(input, clock.now());
      const plan = await repos.plans.create({ ...input, hostId, status: PlanStatus.OPEN });
      return toPlanDto(plan, clock.now());
    },

    async get(id) {
      return toPlanDto(await mustFind(repos.plans, id), clock.now());
    },

    async explore(filters) {
      const { items, total } = await repos.plans.search(filters, {
        page: filters.page,
        pageSize: filters.pageSize,
      });
      const now = clock.now();
      return {
        items: items.map((p) => toPlanDto(p, now)),
        total,
        page: filters.page,
        pageSize: filters.pageSize,
      };
    },

    // Host only. Changing dates or the limit re-derives Plan Status so rule 1 and 3 still hold.
    async update(actorId, id, input) {
      return uow.run(async (tx) => {
        const current = await mustFind(tx.plans, id, true);
        assertHost(current, actorId);
        const merged = { ...current, ...input };
        assertDatesOrdered(merged.startDate, merged.endDate);
        if (input.maxCompanions !== undefined) {
          assertLimitNotBelowAccepted(input.maxCompanions, current.acceptedCount);
        }
        const status = statusFor(merged, current.acceptedCount, clock.now());
        const updated = await tx.plans.update(id, { ...input, status });
        return toPlanDto(updated, clock.now());
      });
    },

    async remove(actorId, id) {
      return uow.run(async (tx) => {
        assertHost(await mustFind(tx.plans, id, true), actorId);
        await tx.plans.remove(id);
      });
    },
  };
}
