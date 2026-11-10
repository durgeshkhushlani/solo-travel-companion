import { FriendStatus } from './enums.js';

export const FriendshipAction = Object.freeze({
  CREATE: 'CREATE',
  ACCEPT_EXISTING: 'ACCEPT_EXISTING',
  NONE: 'NONE',
});

// Rule 5: accepting a Join Request makes Host and Companion Friends, one Friendship per pair.
// `existing` is the stored Friendship between the two Users in either direction, or null.
// Returns what the caller must do; the core never writes to storage itself.
export function friendshipOnAcceptance({ hostId, companionId, existing }) {
  if (hostId === companionId) {
    throw new Error('The Host is never a Companion of their own Travel Plan');
  }
  if (!existing) {
    return {
      action: FriendshipAction.CREATE,
      requesterId: hostId,
      addresseeId: companionId,
      status: FriendStatus.ACCEPTED,
    };
  }
  if (existing.status === FriendStatus.PENDING) {
    return { action: FriendshipAction.ACCEPT_EXISTING, friendshipId: existing.id };
  }
  return { action: FriendshipAction.NONE };
}
