import { FriendStatus } from './enums.js';
import { DomainError, ErrorCode } from './errors.js';
import { assertNotBlocked } from './block.js';

export const MAX_MESSAGE_LENGTH = 2000;

// Private Chat is only for Friends who have not blocked each other. `friendship` is the stored
// Friendship between the two Users (either direction) or null.
export function assertCanChat({ friendship, blockedByReceiver }) {
  if (!friendship || friendship.status !== FriendStatus.ACCEPTED) {
    throw new DomainError(ErrorCode.NOT_FRIENDS, 'Private Chat is only for Friends', 403);
  }
  assertNotBlocked(blockedByReceiver);
}
