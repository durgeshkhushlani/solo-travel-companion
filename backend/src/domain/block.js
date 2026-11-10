import { DomainError, ErrorCode } from './errors.js';

// Rule 4: a Blocked User cannot send the blocker a Join Request, Friend Request or Message.
// `isBlocked` answers "has the receiver blocked the sender?"; the caller looks it up.
export function assertNotBlocked(isBlocked) {
  if (isBlocked) {
    throw new DomainError(ErrorCode.BLOCKED, 'You cannot contact this user', 403);
  }
}

export function assertCanBlock(blockerId, targetId) {
  if (blockerId === targetId) {
    throw new DomainError(ErrorCode.SELF_ACTION, 'You cannot block yourself', 400);
  }
}
