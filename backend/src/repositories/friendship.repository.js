import { FriendStatus } from '../domain/enums.js';

const userSummary = { select: { id: true, name: true, photoUrl: true } };

export function makeFriendshipRepository(db) {
  const either = (a, b) => ({
    OR: [
      { requesterId: a, addresseeId: b },
      { requesterId: b, addresseeId: a },
    ],
  });

  return {
    findBetween: (a, b) => db.friendship.findFirst({ where: either(a, b) }),

    find: (id) => db.friendship.findUnique({ where: { id } }),

    create: ({ requesterId, addresseeId, status }) =>
      db.friendship.create({ data: { requesterId, addresseeId, status } }),

    async setStatus(id, status) {
      await db.friendship.update({ where: { id }, data: { status } });
    },

    async remove(id) {
      await db.friendship.delete({ where: { id } });
    },

    async listAccepted(userId) {
      const rows = await db.friendship.findMany({
        where: {
          status: FriendStatus.ACCEPTED,
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
        include: { requester: userSummary, addressee: userSummary },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map((row) => ({
        friendshipId: row.id,
        user: row.requesterId === userId ? row.addressee : row.requester,
      }));
    },

    async listPendingFor(userId) {
      const rows = await db.friendship.findMany({
        where: { status: FriendStatus.PENDING, addresseeId: userId },
        include: { requester: userSummary },
        orderBy: { createdAt: 'asc' },
      });
      return rows.map((row) => ({ friendshipId: row.id, user: row.requester }));
    },
  };
}

export function makeBlockRepository(db) {
  return {
    async exists(blockerId, blockedId) {
      return (await db.block.count({ where: { blockerId, blockedId } })) > 0;
    },

    async add(blockerId, blockedId) {
      await db.block.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      });
    },

    async remove(blockerId, blockedId) {
      await db.block.deleteMany({ where: { blockerId, blockedId } });
    },

    async list(blockerId) {
      const rows = await db.block.findMany({
        where: { blockerId },
        include: { blocked: userSummary },
      });
      return rows.map((row) => row.blocked);
    },
  };
}
