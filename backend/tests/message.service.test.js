import { describe, it, expect } from 'vitest';
import { createMessageService } from '../src/services/message.service.js';
import { FriendStatus } from '../src/domain/enums.js';
import { ErrorCode } from '../src/domain/errors.js';
import { createWorld } from './helpers/world.js';

async function setup({ friends = true } = {}) {
  const world = createWorld();
  world.addUser({ id: 'asha-1', name: 'Asha' });
  world.addUser({ id: 'ben-1', name: 'Ben' });
  world.addUser({ id: 'cara-1', name: 'Cara' });
  if (friends) {
    await world.repos.friendships.create({
      requesterId: 'asha-1',
      addresseeId: 'ben-1',
      status: FriendStatus.ACCEPTED,
    });
  }
  const service = createMessageService({ repos: world.repos, uow: world.uow, clock: world.clock });
  return { world, service };
}

describe('send', () => {
  it('stores_a_message_between_friends_and_returns_it_unread', async () => {
    const { world, service } = await setup();

    const message = await service.send('asha-1', 'ben-1', 'Hi Ben');

    expect(message).toMatchObject({
      senderId: 'asha-1',
      receiverId: 'ben-1',
      body: 'Hi Ben',
      readAt: null,
    });
    expect(world.db.messages).toHaveLength(1);
  });

  it.each([
    ['strangers', async () => setup({ friends: false }), 'ben-1', ErrorCode.NOT_FRIENDS],
    ['yourself', async () => setup(), 'asha-1', ErrorCode.SELF_ACTION],
    ['an unknown user', async () => setup(), 'nobody', ErrorCode.NOT_FOUND],
  ])('refuses_a_message_to_%s', async (_label, build, target, code) => {
    const { service } = await build();

    await expect(service.send('asha-1', target, 'Hi')).rejects.toMatchObject({ code });
  });

  it('refuses_a_message_from_a_sender_the_receiver_blocked_(rule_4)', async () => {
    const { world, service } = await setup();
    await world.repos.blocks.add('ben-1', 'asha-1');

    await expect(service.send('asha-1', 'ben-1', 'Hi')).rejects.toMatchObject({
      code: ErrorCode.BLOCKED,
    });
    expect(world.db.messages).toHaveLength(0);
  });

  it('still_lets_the_blocker_message_the_user_they_blocked', async () => {
    const { world, service } = await setup();
    await world.repos.blocks.add('ben-1', 'asha-1');

    await expect(service.send('ben-1', 'asha-1', 'Why?')).resolves.toBeDefined();
  });
});

describe('history and read receipts', () => {
  it('returns_both_directions_oldest_first_and_only_for_friends', async () => {
    const { service } = await setup();
    await service.send('asha-1', 'ben-1', 'one');
    await service.send('ben-1', 'asha-1', 'two');

    const history = await service.history('asha-1', 'ben-1');

    expect(history.map((m) => m.body)).toEqual(['one', 'two']);
    await expect(service.history('asha-1', 'cara-1')).rejects.toMatchObject({
      code: ErrorCode.NOT_FRIENDS,
    });
  });

  it('keeps_history_readable_after_a_block', async () => {
    const { world, service } = await setup();
    await service.send('asha-1', 'ben-1', 'one');
    await world.repos.blocks.add('ben-1', 'asha-1');

    await expect(service.history('asha-1', 'ben-1')).resolves.toHaveLength(1);
  });

  it('marks_only_the_messages_sent_to_the_reader_as_read', async () => {
    const { world, service } = await setup();
    await service.send('asha-1', 'ben-1', 'to ben');
    await service.send('ben-1', 'asha-1', 'to asha');

    await service.markRead('ben-1', 'asha-1');

    const [toBen, toAsha] = world.db.messages;
    expect(toBen.readAt).not.toBeNull();
    expect(toAsha.readAt).toBeNull();
  });
});

describe('conversations', () => {
  it('lists_each_friend_with_the_last_message_and_the_unread_badge', async () => {
    const { service } = await setup();
    await service.send('ben-1', 'asha-1', 'first');
    await service.send('ben-1', 'asha-1', 'second');

    const [row] = await service.conversations('asha-1');

    expect(row.user.name).toBe('Ben');
    expect(row.last.body).toBe('second');
    expect(row.unread).toBe(2);
  });

  it('shows_zero_unread_after_reading_and_a_null_last_message_for_a_silent_friend', async () => {
    const { world, service } = await setup();
    await world.repos.friendships.create({
      requesterId: 'asha-1',
      addresseeId: 'cara-1',
      status: FriendStatus.ACCEPTED,
    });
    await service.send('ben-1', 'asha-1', 'hello');
    await service.markRead('asha-1', 'ben-1');

    const rows = await service.conversations('asha-1');

    expect(rows.find((r) => r.user.name === 'Ben').unread).toBe(0);
    expect(rows.find((r) => r.user.name === 'Cara')).toMatchObject({ last: null, unread: 0 });
    expect(rows[0].user.name).toBe('Ben');
  });

  it('counts_unread_messages_only_from_that_friend', async () => {
    const { service } = await setup();
    await service.send('asha-1', 'ben-1', 'from asha');

    const [row] = await service.conversations('asha-1');

    expect(row.unread).toBe(0);
  });
});
