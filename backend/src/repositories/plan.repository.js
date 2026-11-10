import { PlanStatus } from '../domain/enums.js';

const hostSummary = { select: { id: true, name: true, photoUrl: true } };
const include = { host: hostSummary, _count: { select: { companions: true } } };

// Plans leave the database as { ...columns, host, acceptedCount }.
function shape(row) {
  if (!row) return null;
  const { _count, ...plan } = row;
  return { ...plan, acceptedCount: _count.companions };
}

export function makePlanRepository(db) {
  const repo = {
    async findById(id) {
      return shape(await db.travelPlan.findUnique({ where: { id }, include }));
    },

    // Locks the row until the surrounding transaction ends, so concurrent accepts queue up.
    async findByIdForUpdate(id) {
      await db.$queryRaw`SELECT id FROM "TravelPlan" WHERE id = ${id} FOR UPDATE`;
      return repo.findById(id);
    },

    async create(data) {
      return shape(await db.travelPlan.create({ data, include }));
    },

    async update(id, data) {
      return shape(await db.travelPlan.update({ where: { id }, data, include }));
    },

    async setStatus(id, status) {
      await db.travelPlan.update({ where: { id }, data: { status } });
    },

    async remove(id) {
      await db.travelPlan.delete({ where: { id } });
    },

    // Explore Feed. `now` comes from the caller's Clock; soonest trips first.
    async search(filters, { page, pageSize }) {
      const { q, interest, from, to, openOnly, hideEnded, now } = filters;
      const where = {
        AND: [
          q
            ? {
                OR: ['title', 'destination', 'description'].map((field) => ({
                  [field]: { contains: q, mode: 'insensitive' },
                })),
              }
            : {},
          interest.length ? { interests: { hasSome: interest } } : {},
          from ? { startDate: { gte: from } } : {},
          to ? { startDate: { lte: to } } : {},
          hideEnded ? { endDate: { gte: now } } : {},
          // OPEN is kept current on accept, leave and edit, and a started trip is excluded by date.
          openOnly ? { status: PlanStatus.OPEN, startDate: { gt: now } } : {},
        ],
      };
      const [rows, total] = await Promise.all([
        db.travelPlan.findMany({
          where,
          include,
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.travelPlan.count({ where }),
      ]);
      return { items: rows.map(shape), total };
    },

    // Same rule as domain/plan.js hasStarted: a plan has started from its start date itself.
    async closeStartedBy(now) {
      const { count } = await db.travelPlan.updateMany({
        where: { status: { not: PlanStatus.CLOSED }, startDate: { lte: now } },
        data: { status: PlanStatus.CLOSED },
      });
      return count;
    },
  };
  return repo;
}
