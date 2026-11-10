import { describe, it, expect } from 'vitest';
import { assertCanChat } from '../../src/domain/chat.js';
import { FriendStatus } from '../../src/domain/enums.js';
import { ErrorCode } from '../../src/domain/errors.js';

const accepted = { status: FriendStatus.ACCEPTED };
const codeOf = (input) => {
  try {
    assertCanChat(input);
  } catch (e) {
    return e.code;
  }
  return null;
};

describe('Private Chat rules', () => {
  it('allows_friends_who_have_not_blocked_the_sender', () => {
    expect(codeOf({ friendship: accepted, blockedByReceiver: false })).toBeNull();
  });

  it.each([
    ['no friendship at all', null],
    ['a friend request that is still pending', { status: FriendStatus.PENDING }],
  ])('refuses_chat_with_%s', (_label, friendship) => {
    expect(codeOf({ friendship, blockedByReceiver: false })).toBe(ErrorCode.NOT_FRIENDS);
  });

  it('refuses_a_sender_the_receiver_has_blocked_even_though_they_are_friends_(rule_4)', () => {
    expect(codeOf({ friendship: accepted, blockedByReceiver: true })).toBe(ErrorCode.BLOCKED);
  });

  it('reports_not_friends_before_blocked_when_both_apply', () => {
    expect(codeOf({ friendship: null, blockedByReceiver: true })).toBe(ErrorCode.NOT_FRIENDS);
  });
});
