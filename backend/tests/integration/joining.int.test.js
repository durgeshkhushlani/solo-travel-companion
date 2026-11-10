import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { planInput, prisma, resetDatabase, signUp, startApp } from './harness.js';

afterAll(() => prisma.$disconnect());
beforeEach(resetDatabase);

// Scenario S1: Ravi hosts "Spiti in March" with room for 2 Companions.
async function ravisPlan({ maxCompanions = 2 } = {}) {
  const { app, time } = startApp();
  const ravi = await signUp(app, 'Ravi');
  const asha = await signUp(app, 'Asha');
  const ben = await signUp(app, 'Ben');
  const cara = await signUp(app, 'Cara');
  const { body } = await ravi.post('/api/plans', planInput({ maxCompanions }));
  return { app, time, ravi, asha, ben, cara, planId: body.plan.id };
}

const ask = async (user, planId) => (await user.post(`/api/plans/${planId}/requests`)).body.request;

describe('S1: join a Travel Plan end to end', () => {
  it('walks_request_accept_companion_friend_and_full_in_one_flow', async () => {
    const { ravi, asha, planId } = await ravisPlan({ maxCompanions: 1 });

    const sent = await asha.post(`/api/plans/${planId}/requests`);
    const accepted = await ravi.post(`/api/requests/${sent.body.request.id}/accept`);
    const companions = await ravi.get(`/api/plans/${planId}/companions`);
    const friends = await asha.get('/api/friends');

    expect(sent.status).toBe(201);
    expect(accepted.body.request.status).toBe('ACCEPTED');
    expect(accepted.body.plan).toMatchObject({ status: 'FULL', spotsLeft: 0, acceptedCount: 1 });
    expect(companions.body.items.map((u) => u.name)).toEqual(['Asha']);
    expect(friends.body.items.map((f) => f.user.name)).toEqual(['Ravi']);
  });

  it('shows_the_host_the_pending_requests_and_the_requester_their_own', async () => {
    const { ravi, asha, planId } = await ravisPlan();
    await ask(asha, planId);

    const forHost = await ravi.get(`/api/plans/${planId}/requests`);
    const mine = await asha.get('/api/requests/mine');
    const notHost = await asha.get(`/api/plans/${planId}/requests`);

    expect(forHost.body.items).toHaveLength(1);
    expect(mine.body.items[0]).toMatchObject({ status: 'PENDING', plan: { id: planId } });
    expect(notHost.status).toBe(403);
  });
});

describe('Rule 1: the companion limit', () => {
  it('refuses_the_second_accept_when_one_spot_is_left_and_leaves_one_companion', async () => {
    const { ravi, asha, ben, planId } = await ravisPlan({ maxCompanions: 1 });
    const first = await ask(asha, planId);
    const second = await ask(ben, planId);

    await ravi.post(`/api/requests/${first.id}/accept`);
    const refused = await ravi.post(`/api/requests/${second.id}/accept`);

    expect(refused.status).toBe(409);
    expect(await prisma.companion.count({ where: { planId } })).toBe(1);
    expect((await prisma.joinRequest.findUnique({ where: { id: second.id } })).status).toBe(
      'PENDING',
    );
  });

  it('accepts_exactly_one_when_two_accepts_race_for_the_last_spot_(F1.2)', async () => {
    const { ravi, asha, ben, planId } = await ravisPlan({ maxCompanions: 1 });
    const a = await ask(asha, planId);
    const b = await ask(ben, planId);

    const results = await Promise.all([
      ravi.post(`/api/requests/${a.id}/accept`),
      ravi.post(`/api/requests/${b.id}/accept`),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.companion.count({ where: { planId } })).toBe(1);
  });

  it('holds_the_limit_under_many_simultaneous_accepts', async () => {
    const { app, ravi, planId } = await ravisPlan({ maxCompanions: 2 });
    const travellers = await Promise.all(
      ['T1', 'T2', 'T3', 'T4', 'T5'].map((name) => signUp(app, name)),
    );
    const requests = [];
    for (const t of travellers) requests.push(await ask(t, planId));

    const results = await Promise.all(
      requests.map((r) => ravi.post(`/api/requests/${r.id}/accept`)),
    );

    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    expect(await prisma.companion.count({ where: { planId } })).toBe(2);
  });

  it('refuses_a_new_request_while_the_plan_is_full', async () => {
    const { ravi, asha, ben, planId } = await ravisPlan({ maxCompanions: 1 });
    await ravi.post(`/api/requests/${(await ask(asha, planId)).id}/accept`);

    const res = await ben.post(`/api/plans/${planId}/requests`);

    expect(res.status).toBe(409);
  });

  it('reopens_the_plan_when_a_companion_leaves', async () => {
    const { ravi, asha, ben, planId } = await ravisPlan({ maxCompanions: 1 });
    await ravi.post(`/api/requests/${(await ask(asha, planId)).id}/accept`);

    const left = await asha.delete(`/api/plans/${planId}/companions/me`);
    const plan = await ravi.get(`/api/plans/${planId}`);
    const newcomer = await ben.post(`/api/plans/${planId}/requests`);

    expect(left.status).toBe(204);
    expect(plan.body.plan.status).toBe('OPEN');
    expect(newcomer.status).toBe(201);
  });
});

describe('Rule 2: only the Host decides', () => {
  it.each(['asha', 'ben'])('refuses_%s_accepting_or_rejecting_for_the_host', async (who) => {
    const ctx = await ravisPlan();
    const request = await ask(ctx.asha, ctx.planId);

    const accept = await ctx[who].post(`/api/requests/${request.id}/accept`);
    const reject = await ctx[who].post(`/api/requests/${request.id}/reject`);

    expect([accept.status, reject.status]).toEqual([403, 403]);
    expect((await prisma.joinRequest.findUnique({ where: { id: request.id } })).status).toBe(
      'PENDING',
    );
  });

  it('refuses_the_host_removing_nobody_but_lets_them_remove_a_real_companion', async () => {
    const { ravi, asha, ben, planId } = await ravisPlan();
    await ravi.post(`/api/requests/${(await ask(asha, planId)).id}/accept`);

    const byStranger = await ben.delete(`/api/plans/${planId}/companions/${asha.id}`);
    const byHost = await ravi.delete(`/api/plans/${planId}/companions/${asha.id}`);

    expect([byStranger.status, byHost.status]).toEqual([403, 204]);
  });

  it('lets_only_the_requester_cancel', async () => {
    const { ravi, asha, planId } = await ravisPlan();
    const request = await ask(asha, planId);

    const byHost = await ravi.post(`/api/requests/${request.id}/cancel`);
    const byRequester = await asha.post(`/api/requests/${request.id}/cancel`);

    expect([byHost.status, byRequester.status]).toEqual([403, 200]);
  });
});

describe('Rule 3: Auto-Close', () => {
  it('refuses_new_requests_once_the_start_date_is_reached_even_before_the_job_runs', async () => {
    const { asha, planId, time } = await ravisPlan();
    time.current = new Date('2027-03-01T00:00:00.000Z');

    const res = await asha.post(`/api/plans/${planId}/requests`);

    expect(res.status).toBe(409);
    expect((await asha.get(`/api/plans/${planId}`)).body.plan.status).toBe('CLOSED');
  });
});

describe('Rule 4: Block', () => {
  it('refuses_a_join_request_from_a_user_the_host_has_blocked', async () => {
    const { ravi, asha, planId } = await ravisPlan();
    await ravi.post('/api/friends/blocks', { userId: asha.id });

    const res = await asha.post(`/api/plans/${planId}/requests`);

    expect(res.status).toBe(403);
  });

  it('refuses_a_friend_request_to_someone_who_blocked_the_sender', async () => {
    const { ravi, asha } = await ravisPlan();
    await ravi.post('/api/friends/blocks', { userId: asha.id });

    const res = await asha.post('/api/friends/requests', { userId: ravi.id });

    expect(res.status).toBe(403);
  });

  it('allows_contact_again_after_unblock', async () => {
    const { ravi, asha, planId } = await ravisPlan();
    await ravi.post('/api/friends/blocks', { userId: asha.id });
    await ravi.delete(`/api/friends/blocks/${asha.id}`);

    const res = await asha.post(`/api/plans/${planId}/requests`);

    expect(res.status).toBe(201);
  });
});

describe('Rule 5: Companions become Friends once', () => {
  it('creates_one_friendship_even_when_the_pair_were_already_friends', async () => {
    const { ravi, asha, planId } = await ravisPlan();
    const friendRequest = await asha.post('/api/friends/requests', { userId: ravi.id });
    await ravi.post(`/api/friends/requests/${friendRequest.body.friendshipId}/accept`);

    await ravi.post(`/api/requests/${(await ask(asha, planId)).id}/accept`);

    expect(await prisma.friendship.count()).toBe(1);
  });

  it('promotes_a_pending_friend_request_when_the_join_request_is_accepted', async () => {
    const { ravi, asha, planId } = await ravisPlan();
    await asha.post('/api/friends/requests', { userId: ravi.id });

    await ravi.post(`/api/requests/${(await ask(asha, planId)).id}/accept`);

    const rows = await prisma.friendship.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('ACCEPTED');
  });

  it('is_backed_by_a_database_index_that_rejects_the_reversed_duplicate_pair', async () => {
    const { ravi, asha } = await ravisPlan();
    await prisma.friendship.create({
      data: { requesterId: ravi.id, addresseeId: asha.id, status: 'ACCEPTED' },
    });

    const reversed = prisma.friendship.create({
      data: { requesterId: asha.id, addresseeId: ravi.id, status: 'PENDING' },
    });

    await expect(reversed).rejects.toMatchObject({ code: 'P2002' });
  });
});
