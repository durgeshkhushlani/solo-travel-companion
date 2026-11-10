import { assertCanChat } from '../domain/chat.js';
import { DomainError, ErrorCode, notFound } from '../domain/errors.js';
import { toSummary } from '../utils/dto.js';

export const toMessageDto = (m) => ({
  id: m.id,
  senderId: m.senderId,
  receiverId: m.receiverId,
  body: m.body,
  readAt: m.readAt ?? null,
  createdAt: m.createdAt,
});

// Private Chat use cases. Who may talk to whom is decided by the domain (assertCanChat).
export function createMessageService({ repos, uow, clock }) {
  return {
    async send(senderId, receiverId, body) {
      if (senderId === receiverId) {
        throw new DomainError(ErrorCode.SELF_ACTION, 'You cannot message yourself', 400);
      }
      return uow.run(async (tx) => {
        const receiver = await tx.users.findById(receiverId);
        if (!receiver || !receiver.active) throw notFound('User');
        assertCanChat({
          friendship: await tx.friendships.findBetween(senderId, receiverId),
          blockedByReceiver: await tx.blocks.exists(receiverId, senderId),
        });
        return toMessageDto(await tx.messages.create({ senderId, receiverId, body }));
      });
    },

    // Reading history needs a Friendship but not the absence of a Block.
    async history(userId, otherId) {
      await assertFriends(repos, userId, otherId);
      return (await repos.messages.between(userId, otherId)).map(toMessageDto);
    },

    async markRead(userId, otherId) {
      await assertFriends(repos, userId, otherId);
      await repos.messages.markRead(otherId, userId, clock.now());
    },

    // One row per Friend: the last message and the Unread Badge, newest conversation first.
    async conversations(userId) {
      const friends = await repos.friendships.listAccepted(userId);
      const rows = await Promise.all(
        friends.map(async ({ user }) => {
          const [last, unread] = await Promise.all([
            repos.messages.last(userId, user.id),
            repos.messages.unreadCount(user.id, userId),
          ]);
          return { user: toSummary(user), last: last ? toMessageDto(last) : null, unread };
        }),
      );
      const stamp = (row) => (row.last ? new Date(row.last.createdAt).getTime() : 0);
      return rows.sort((a, b) => stamp(b) - stamp(a));
    },
  };
}

async function assertFriends(repos, userId, otherId) {
  assertCanChat({
    friendship: await repos.friendships.findBetween(userId, otherId),
    blockedByReceiver: false,
  });
}
