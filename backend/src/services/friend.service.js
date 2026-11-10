import { assertCanBlock, assertNotBlocked } from '../domain/block.js';
import { FriendStatus } from '../domain/enums.js';
import { DomainError, ErrorCode, notFound } from '../domain/errors.js';

// Friend Request, Friendship and Block use cases.
export function createFriendService({ repos, uow }) {
  const mustFindUser = async (tx, id) => {
    const user = await tx.users.findById(id);
    if (!user || !user.active) throw notFound('User');
    return user;
  };

  return {
    async sendRequest(userId, targetId) {
      return uow.run(async (tx) => {
        if (userId === targetId) {
          throw new DomainError(ErrorCode.SELF_ACTION, 'You cannot befriend yourself', 400);
        }
        await mustFindUser(tx, targetId);
        assertNotBlocked(await tx.blocks.exists(targetId, userId));

        const existing = await tx.friendships.findBetween(userId, targetId);
        if (!existing) {
          const created = await tx.friendships.create({
            requesterId: userId,
            addresseeId: targetId,
            status: FriendStatus.PENDING,
          });
          return { friendshipId: created.id };
        }
        if (existing.status === FriendStatus.ACCEPTED) {
          throw new DomainError(ErrorCode.ALREADY_FRIENDS, 'You are already Friends', 409);
        }
        if (existing.requesterId === userId) {
          throw new DomainError(ErrorCode.ALREADY_REQUESTED, 'Friend Request already sent', 409);
        }
        // They asked first: asking back means both want it, so accept instead of duplicating.
        await tx.friendships.setStatus(existing.id, FriendStatus.ACCEPTED);
        return { friendshipId: existing.id };
      });
    },

    async accept(userId, friendshipId) {
      return uow.run(async (tx) => {
        const friendship = await tx.friendships.find(friendshipId);
        if (!friendship) throw notFound('Friend Request');
        if (friendship.addresseeId !== userId) {
          throw new DomainError(ErrorCode.NOT_ADDRESSEE, 'This Friend Request is not for you', 403);
        }
        if (friendship.status !== FriendStatus.PENDING) {
          throw new DomainError(ErrorCode.ALREADY_FRIENDS, 'Already accepted', 409);
        }
        await tx.friendships.setStatus(friendshipId, FriendStatus.ACCEPTED);
        return { friendshipId };
      });
    },

    async unfriend(userId, otherId) {
      return uow.run(async (tx) => {
        const friendship = await tx.friendships.findBetween(userId, otherId);
        if (!friendship || friendship.status !== FriendStatus.ACCEPTED) throw notFound('Friend');
        await tx.friendships.remove(friendship.id);
      });
    },

    list: (userId) => repos.friendships.listAccepted(userId),
    pending: (userId) => repos.friendships.listPendingFor(userId),

    // Block does not delete the Friendship (scenario S3); it stops the blocked User contacting.
    async block(userId, targetId) {
      assertCanBlock(userId, targetId);
      return uow.run(async (tx) => {
        await mustFindUser(tx, targetId);
        await tx.blocks.add(userId, targetId);
      });
    },

    async unblock(userId, targetId) {
      await repos.blocks.remove(userId, targetId);
    },

    blocks: (userId) => repos.blocks.list(userId),
  };
}
