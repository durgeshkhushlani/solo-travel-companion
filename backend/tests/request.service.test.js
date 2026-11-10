import { describe, it, expect } from 'vitest';
import { createRequestService } from '../src/services/request.service.js';
import { FriendStatus, PlanStatus, RequestStatus } from '../src/domain/enums.js';
import { ErrorCode } from '../src/domain/errors.js';
import { createWorld } from './helpers/world.js';
import { at } from './helpers/factories.js';

// Scenario S1: Ravi (host-1) hosts "Spiti in March" with room for 2 Companions.
function setup({ maxCompanions = 2 } = {}) {
  const world = createWorld();
  world.addUser({ id: 'host-1', name: 'Ravi' });
  world.addUser({ id: 'asha-1', name: 'Asha' });
  world.addUser({ id: 'ben-1', name: 'Ben' });
  world.addUser({ id: 'cara-1', name: 'Cara' });
  const plan = world.addPlan({ maxCompanions });
  const service = createRequestService({ repos: world.repos, uow: world.uow, clock: world.clock });
  return { world, plan, service };
}

async function acceptedBy(service, userIds, planId) {
  for (const userId of userIds) {
    const request = await service.send(userId, planId);
    await service.accept('host-1', request.id);
  }
}

describe('send', () => {
  it('creates_a_pending_request_shown_with_the_requester_and_plan', async () => {
    const { service, plan } = setup();

    const request = await service.send('asha-1', plan.id);

    expect(request).toMatchObject({ status: RequestStatus.PENDING, user: { id: 'asha-1' } });
    expect(request.plan.id).toBe(plan.id);
  });

  it('refuses_a_second_request_from_the_same_user', async () => {
    const { service, plan } = setup();
    await service.send('asha-1', plan.id);

    await expect(service.send('asha-1', plan.id)).rejects.toMatchObject({
      code: ErrorCode.ALREADY_REQUESTED,
    });
  });

  it('refuses_a_request_from_a_user_the_host_has_blocked_(rule_4)', async () => {
    const { world, service, plan } = setup();
    await world.repos.blocks.add('host-1', 'asha-1');

    await expect(service.send('asha-1', plan.id)).rejects.toMatchObject({
      code: ErrorCode.BLOCKED,
    });
  });

  it('lets_a_user_ask_again_after_cancelling', async () => {
    const { service, plan } = setup();
    const first = await service.send('asha-1', plan.id);
    await service.cancel('asha-1', first.id);

    const again = await service.send('asha-1', plan.id);

    expect(again).toMatchObject({ id: first.id, status: RequestStatus.PENDING });
  });

  it('refuses_a_request_on_a_plan_that_has_started', async () => {
    const { world, service, plan } = setup();
    world.now = at('2027-03-01T00:00:00.000Z');

    await expect(service.send('asha-1', plan.id)).rejects.toMatchObject({
      code: ErrorCode.PLAN_CLOSED,
    });
  });

  it('answers_not_found_for_an_unknown_plan', async () => {
    const { service } = setup();

    await expect(service.send('asha-1', 'missing')).rejects.toMatchObject({ status: 404 });
  });
});

describe('accept', () => {
  it('makes_the_requester_a_companion_and_the_host_a_friend_(rules_1_and_5)', async () => {
    const { world, service, plan } = setup();
    const request = await service.send('asha-1', plan.id);

    const result = await service.accept('host-1', request.id);

    expect(result.request.status).toBe(RequestStatus.ACCEPTED);
    expect(result.plan).toMatchObject({ acceptedCount: 1, spotsLeft: 1, status: PlanStatus.OPEN });
    expect(world.db.companions).toEqual([{ planId: plan.id, userId: 'asha-1' }]);
    expect(world.db.friendships).toMatchObject([
      { requesterId: 'host-1', addresseeId: 'asha-1', status: FriendStatus.ACCEPTED },
    ]);
  });

  it('sets_the_plan_full_when_the_last_spot_is_taken_(rule_1)', async () => {
    const { service, plan } = setup({ maxCompanions: 1 });
    const request = await service.send('asha-1', plan.id);

    const result = await service.accept('host-1', request.id);

    expect(result.plan).toMatchObject({ status: PlanStatus.FULL, spotsLeft: 0 });
  });

  it('refuses_the_second_accept_once_the_plan_is_full_and_leaves_that_request_pending', async () => {
    const { world, service, plan } = setup({ maxCompanions: 1 });
    const first = await service.send('asha-1', plan.id);
    const second = await service.send('ben-1', plan.id);
    await service.accept('host-1', first.id);

    await expect(service.accept('host-1', second.id)).rejects.toMatchObject({
      code: ErrorCode.PLAN_FULL,
    });
    expect(world.db.requests.find((r) => r.id === second.id).status).toBe(RequestStatus.PENDING);
    expect(world.db.companions).toHaveLength(1);
  });

  it.each(['asha-1', 'ben-1'])('refuses_%s_accepting_for_the_host_(rule_2)', async (actorId) => {
    const { service, plan } = setup();
    const request = await service.send('asha-1', plan.id);

    await expect(service.accept(actorId, request.id)).rejects.toMatchObject({
      code: ErrorCode.NOT_HOST,
    });
  });

  it('refuses_accepting_a_request_that_was_already_decided', async () => {
    const { service, plan } = setup();
    const request = await service.send('asha-1', plan.id);
    await service.accept('host-1', request.id);

    await expect(service.accept('host-1', request.id)).rejects.toMatchObject({
      code: ErrorCode.REQUEST_NOT_PENDING,
    });
  });

  it('refuses_accepting_someone_the_host_blocked_after_they_asked', async () => {
    const { world, service, plan } = setup();
    const request = await service.send('asha-1', plan.id);
    await world.repos.blocks.add('host-1', 'asha-1');

    await expect(service.accept('host-1', request.id)).rejects.toMatchObject({
      code: ErrorCode.BLOCKED,
    });
  });

  it('keeps_one_friendship_when_the_pair_were_already_friends_from_an_earlier_trip', async () => {
    const { world, service, plan } = setup();
    await world.repos.friendships.create({
      requesterId: 'asha-1',
      addresseeId: 'host-1',
      status: FriendStatus.ACCEPTED,
    });
    const request = await service.send('asha-1', plan.id);

    await service.accept('host-1', request.id);

    expect(world.db.friendships).toHaveLength(1);
  });

  it('promotes_a_pending_friend_request_instead_of_duplicating_it', async () => {
    const { world, service, plan } = setup();
    await world.repos.friendships.create({
      requesterId: 'asha-1',
      addresseeId: 'host-1',
      status: FriendStatus.PENDING,
    });
    const request = await service.send('asha-1', plan.id);

    await service.accept('host-1', request.id);

    expect(world.db.friendships).toHaveLength(1);
    expect(world.db.friendships[0].status).toBe(FriendStatus.ACCEPTED);
  });

  it('answers_not_found_for_an_unknown_request', async () => {
    const { service } = setup();

    await expect(service.accept('host-1', 'missing')).rejects.toMatchObject({ status: 404 });
  });
});

describe('reject and cancel', () => {
  it('lets_the_host_reject_and_keeps_the_user_from_asking_again', async () => {
    const { service, plan } = setup();
    const request = await service.send('asha-1', plan.id);

    const rejected = await service.reject('host-1', request.id);

    expect(rejected.status).toBe(RequestStatus.REJECTED);
    await expect(service.send('asha-1', plan.id)).rejects.toMatchObject({
      code: ErrorCode.ALREADY_REQUESTED,
    });
  });

  it('refuses_a_non_host_rejecting', async () => {
    const { service, plan } = setup();
    const request = await service.send('asha-1', plan.id);

    await expect(service.reject('asha-1', request.id)).rejects.toMatchObject({
      code: ErrorCode.NOT_HOST,
    });
  });

  it('refuses_the_host_cancelling_someone_elses_request', async () => {
    const { service, plan } = setup();
    const request = await service.send('asha-1', plan.id);

    await expect(service.cancel('host-1', request.id)).rejects.toMatchObject({
      code: ErrorCode.NOT_REQUESTER,
    });
  });
});

describe('leave and remove', () => {
  it('reopens_a_full_plan_when_a_companion_leaves_and_lets_them_ask_again', async () => {
    const { world, service, plan } = setup({ maxCompanions: 1 });
    await acceptedBy(service, ['asha-1'], plan.id);

    await service.leave('asha-1', plan.id);

    expect(world.db.plans[0].status).toBe(PlanStatus.OPEN);
    expect(world.db.companions).toHaveLength(0);
    const again = await service.send('asha-1', plan.id);
    expect(again.status).toBe(RequestStatus.PENDING);
  });

  it('refuses_leaving_a_plan_the_user_never_joined', async () => {
    const { service, plan } = setup();

    await expect(service.leave('asha-1', plan.id)).rejects.toMatchObject({ status: 404 });
  });

  it('lets_the_host_remove_a_companion_who_then_cannot_ask_again', async () => {
    const { service, plan } = setup();
    await acceptedBy(service, ['asha-1'], plan.id);

    await service.removeCompanion('host-1', plan.id, 'asha-1');

    await expect(service.send('asha-1', plan.id)).rejects.toMatchObject({
      code: ErrorCode.ALREADY_REQUESTED,
    });
  });

  it('refuses_a_non_host_removing_a_companion', async () => {
    const { service, plan } = setup();
    await acceptedBy(service, ['asha-1'], plan.id);

    await expect(service.removeCompanion('ben-1', plan.id, 'asha-1')).rejects.toMatchObject({
      code: ErrorCode.NOT_HOST,
    });
  });
});

describe('lists', () => {
  it('shows_the_host_the_requests_on_their_plan_and_nobody_else', async () => {
    const { service, plan } = setup();
    await service.send('asha-1', plan.id);

    const items = await service.listForPlan('host-1', plan.id);

    expect(items).toHaveLength(1);
    await expect(service.listForPlan('asha-1', plan.id)).rejects.toMatchObject({
      code: ErrorCode.NOT_HOST,
    });
  });

  it('shows_a_user_only_their_own_requests', async () => {
    const { service, plan } = setup();
    await service.send('asha-1', plan.id);
    await service.send('ben-1', plan.id);

    const mine = await service.mine('asha-1');

    expect(mine.map((r) => r.user.id)).toEqual(['asha-1']);
  });
});
