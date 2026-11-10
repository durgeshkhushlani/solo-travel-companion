import { describe, it, expect } from 'vitest';
import { createFriendService } from '../src/services/friend.service.js';
import { FriendStatus } from '../src/domain/enums.js';
import { ErrorCode } from '../src/domain/errors.js';
import { createWorld } from './helpers/world.js';

function setup() {
  const world = createWorld();
  world.addUser({ id: 'asha-1', name: 'Asha' });
  world.addUser({ id: 'ben-1', name: 'Ben' });
  world.addUser({ id: 'gone-1', name: 'Gone', active: false });
  const service = createFriendService({ repos: world.repos, uow: world.uow });
  return { world, service };
}

describe('sendRequest', () => {
  it('creates_a_pending_friendship_from_sender_to_target', async () => {
    const { world, service } = setup();

    await service.sendRequest('asha-1', 'ben-1');

    expect(world.db.friendships).toMatchObject([
      { requesterId: 'asha-1', addresseeId: 'ben-1', status: FriendStatus.PENDING },
    ]);
  });

  it('refuses_a_request_to_a_user_who_blocked_the_sender_(rule_4)', async () => {
    const { world, service } = setup();
    await world.repos.blocks.add('ben-1', 'asha-1');

    await expect(service.sendRequest('asha-1', 'ben-1')).rejects.toMatchObject({
      code: ErrorCode.BLOCKED,
    });
  });

  it('still_lets_the_blocker_send_a_request_to_the_user_they_blocked', async () => {
    const { world, service } = setup();
    await world.repos.blocks.add('asha-1', 'ben-1');

    await expect(service.sendRequest('asha-1', 'ben-1')).resolves.toBeDefined();
  });

  it.each([
    ['yourself', 'asha-1', ErrorCode.SELF_ACTION],
    ['an unknown user', 'nobody', ErrorCode.NOT_FOUND],
    ['a deactivated user', 'gone-1', ErrorCode.NOT_FOUND],
  ])('refuses_a_request_to_%s', async (_label, target, code) => {
    const { service } = setup();

    await expect(service.sendRequest('asha-1', target)).rejects.toMatchObject({ code });
  });

  it('refuses_a_repeat_request', async () => {
    const { service } = setup();
    await service.sendRequest('asha-1', 'ben-1');

    await expect(service.sendRequest('asha-1', 'ben-1')).rejects.toMatchObject({
      code: ErrorCode.ALREADY_REQUESTED,
    });
  });

  it('accepts_instead_of_duplicating_when_the_other_user_asked_first', async () => {
    const { world, service } = setup();
    await service.sendRequest('ben-1', 'asha-1');

    await service.sendRequest('asha-1', 'ben-1');

    expect(world.db.friendships).toHaveLength(1);
    expect(world.db.friendships[0].status).toBe(FriendStatus.ACCEPTED);
  });

  it('refuses_a_request_between_existing_friends', async () => {
    const { world, service } = setup();
    await world.repos.friendships.create({
      requesterId: 'ben-1',
      addresseeId: 'asha-1',
      status: FriendStatus.ACCEPTED,
    });

    await expect(service.sendRequest('asha-1', 'ben-1')).rejects.toMatchObject({
      code: ErrorCode.ALREADY_FRIENDS,
    });
  });
});

describe('accept', () => {
  it('lets_only_the_addressee_accept', async () => {
    const { service } = setup();
    const { friendshipId } = await service.sendRequest('asha-1', 'ben-1');

    await expect(service.accept('asha-1', friendshipId)).rejects.toMatchObject({
      code: ErrorCode.NOT_ADDRESSEE,
    });
    await expect(service.accept('ben-1', friendshipId)).resolves.toEqual({ friendshipId });
  });

  it('shows_each_user_the_other_in_their_friend_list_once_accepted', async () => {
    const { service } = setup();
    const { friendshipId } = await service.sendRequest('asha-1', 'ben-1');
    await service.accept('ben-1', friendshipId);

    const ashasFriends = await service.list('asha-1');
    const bensFriends = await service.list('ben-1');

    expect(ashasFriends.map((f) => f.user.id)).toEqual(['ben-1']);
    expect(bensFriends.map((f) => f.user.id)).toEqual(['asha-1']);
  });

  it('lists_an_unanswered_request_under_the_addressee_pending_list_only', async () => {
    const { service } = setup();
    await service.sendRequest('asha-1', 'ben-1');

    expect(await service.pending('ben-1')).toHaveLength(1);
    expect(await service.pending('asha-1')).toHaveLength(0);
    expect(await service.list('ben-1')).toHaveLength(0);
  });
});

describe('unfriend and block', () => {
  it('removes_the_friendship_for_both_users', async () => {
    const { service } = setup();
    const { friendshipId } = await service.sendRequest('asha-1', 'ben-1');
    await service.accept('ben-1', friendshipId);

    await service.unfriend('ben-1', 'asha-1');

    expect(await service.list('asha-1')).toHaveLength(0);
  });

  it('refuses_unfriending_someone_who_is_not_a_friend', async () => {
    const { service } = setup();

    await expect(service.unfriend('asha-1', 'ben-1')).rejects.toMatchObject({ status: 404 });
  });

  it('keeps_the_friendship_when_one_user_blocks_the_other', async () => {
    const { world, service } = setup();
    const { friendshipId } = await service.sendRequest('asha-1', 'ben-1');
    await service.accept('ben-1', friendshipId);

    await service.block('ben-1', 'asha-1');

    expect(world.db.friendships).toHaveLength(1);
    expect((await service.blocks('ben-1')).map((u) => u.id)).toEqual(['asha-1']);
  });

  it('refuses_blocking_yourself', async () => {
    const { service } = setup();

    await expect(service.block('asha-1', 'asha-1')).rejects.toMatchObject({
      code: ErrorCode.SELF_ACTION,
    });
  });

  it('forgets_a_block_after_unblock', async () => {
    const { service } = setup();
    await service.block('ben-1', 'asha-1');

    await service.unblock('ben-1', 'asha-1');

    expect(await service.blocks('ben-1')).toEqual([]);
  });

  it('records_a_block_only_once_when_blocking_twice', async () => {
    const { world, service } = setup();

    await service.block('ben-1', 'asha-1');
    await service.block('ben-1', 'asha-1');

    expect(world.db.blocks).toHaveLength(1);
  });
});
