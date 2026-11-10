import { describe, it, expect } from 'vitest';
import { FriendshipAction, friendshipOnAcceptance } from '../../src/domain/friendship.js';
import { FriendStatus } from '../../src/domain/enums.js';

const pair = { hostId: 'host-1', companionId: 'asha-1' };

describe('Companions become Friends (rule 5)', () => {
  it('creates_an_accepted_friendship_when_the_two_users_are_strangers', () => {
    const decision = friendshipOnAcceptance({ ...pair, existing: null });

    expect(decision).toEqual({
      action: FriendshipAction.CREATE,
      requesterId: 'host-1',
      addresseeId: 'asha-1',
      status: FriendStatus.ACCEPTED,
    });
  });

  it('accepts_the_pending_friend_request_instead_of_creating_a_second_friendship', () => {
    const existing = { id: 'fr-9', status: FriendStatus.PENDING };

    const decision = friendshipOnAcceptance({ ...pair, existing });

    expect(decision).toEqual({
      action: FriendshipAction.ACCEPT_EXISTING,
      friendshipId: 'fr-9',
    });
  });

  it('does_nothing_when_they_are_already_friends_from_an_earlier_trip', () => {
    const existing = { id: 'fr-9', status: FriendStatus.ACCEPTED };

    const decision = friendshipOnAcceptance({ ...pair, existing });

    expect(decision).toEqual({ action: FriendshipAction.NONE });
  });

  it('refuses_to_befriend_a_host_with_themselves', () => {
    expect(() =>
      friendshipOnAcceptance({ hostId: 'host-1', companionId: 'host-1', existing: null }),
    ).toThrow('never a Companion of their own');
  });
});
