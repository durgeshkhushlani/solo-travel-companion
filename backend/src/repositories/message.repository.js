const HISTORY_LIMIT = 200;

export function makeMessageRepository(db) {
  const between = (a, b) => ({
    OR: [
      { senderId: a, receiverId: b },
      { senderId: b, receiverId: a },
    ],
  });

  return {
    create: ({ senderId, receiverId, body }) =>
      db.message.create({ data: { senderId, receiverId, body } }),

    // The latest messages of a conversation, returned oldest first.
    async between(a, b) {
      const rows = await db.message.findMany({
        where: between(a, b),
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
      });
      return rows.reverse();
    },

    last: (a, b) => db.message.findFirst({ where: between(a, b), orderBy: { createdAt: 'desc' } }),

    // The Unread Badge: messages `fromId` sent to `toId` that `toId` has not read.
    unreadCount: (fromId, toId) =>
      db.message.count({ where: { senderId: fromId, receiverId: toId, readAt: null } }),

    async markRead(fromId, toId, now) {
      await db.message.updateMany({
        where: { senderId: fromId, receiverId: toId, readAt: null },
        data: { readAt: now },
      });
    },
  };
}
