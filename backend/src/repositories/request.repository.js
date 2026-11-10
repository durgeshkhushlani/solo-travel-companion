const userSummary = { select: { id: true, name: true, photoUrl: true } };
const withParts = {
  user: userSummary,
  plan: { select: { id: true, title: true, startDate: true } },
};

export function makeRequestRepository(db) {
  return {
    find: (id) => db.joinRequest.findUnique({ where: { id } }),

    findByPlanAndUser: (planId, userId) =>
      db.joinRequest.findUnique({ where: { planId_userId: { planId, userId } } }),

    create: ({ planId, userId }) => db.joinRequest.create({ data: { planId, userId } }),

    setStatus: (id, status) => db.joinRequest.update({ where: { id }, data: { status } }),

    listForPlan: (planId) =>
      db.joinRequest.findMany({
        where: { planId },
        include: withParts,
        orderBy: { createdAt: 'asc' },
      }),

    listForUser: (userId) =>
      db.joinRequest.findMany({
        where: { userId },
        include: withParts,
        orderBy: { createdAt: 'desc' },
      }),
  };
}

export function makeCompanionRepository(db) {
  return {
    async add(planId, userId) {
      await db.companion.create({ data: { planId, userId } });
    },

    async remove(planId, userId) {
      await db.companion.deleteMany({ where: { planId, userId } });
    },

    async has(planId, userId) {
      return (await db.companion.count({ where: { planId, userId } })) > 0;
    },

    async list(planId) {
      const rows = await db.companion.findMany({
        where: { planId },
        include: { user: userSummary },
        orderBy: { joinedAt: 'asc' },
      });
      return rows.map((row) => row.user);
    },
  };
}
