import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma, resetDatabase, signUp, startApp } from './harness.js';

afterAll(() => prisma.$disconnect());
beforeEach(resetDatabase);

describe('Friend Requests over HTTP', () => {
  it('walks_send_accept_list_and_unfriend', async () => {
    const { app } = startApp();
    const asha = await signUp(app, 'Asha');
    const ben = await signUp(app, 'Ben');

    const sent = await asha.post('/api/friends/requests', { userId: ben.id });
    const incoming = await ben.get('/api/friends/requests');
    const accepted = await ben.post(`/api/friends/requests/${sent.body.friendshipId}/accept`);
    const ashasFriends = await asha.get('/api/friends');
    const unfriended = await asha.delete(`/api/friends/${ben.id}`);
    const after = await ben.get('/api/friends');

    expect(incoming.body.items.map((f) => f.user.name)).toEqual(['Asha']);
    expect(accepted.status).toBe(200);
    expect(ashasFriends.body.items.map((f) => f.user.name)).toEqual(['Ben']);
    expect(unfriended.status).toBe(204);
    expect(after.body.items).toEqual([]);
  });

  it('refuses_the_sender_accepting_their_own_request', async () => {
    const { app } = startApp();
    const asha = await signUp(app, 'Asha');
    const ben = await signUp(app, 'Ben');
    const sent = await asha.post('/api/friends/requests', { userId: ben.id });

    const res = await asha.post(`/api/friends/requests/${sent.body.friendshipId}/accept`);

    expect(res.status).toBe(403);
  });

  it('keeps_a_friendship_when_one_user_blocks_the_other_and_lists_the_block', async () => {
    const { app } = startApp();
    const asha = await signUp(app, 'Asha');
    const ben = await signUp(app, 'Ben');
    const sent = await asha.post('/api/friends/requests', { userId: ben.id });
    await ben.post(`/api/friends/requests/${sent.body.friendshipId}/accept`);

    await ben.post('/api/friends/blocks', { userId: asha.id });

    expect(await prisma.friendship.count()).toBe(1);
    expect((await ben.get('/api/friends/blocks')).body.items.map((u) => u.name)).toEqual(['Asha']);
  });
});

describe('Profiles', () => {
  it('shows_a_users_profile_to_others_without_their_email_and_to_themselves_with_it', async () => {
    const { app } = startApp();
    const asha = await signUp(app, 'Asha');
    const ben = await signUp(app, 'Ben');

    const seenByBen = await ben.get(`/api/users/${asha.id}`);
    const seenByAsha = await asha.get(`/api/users/${asha.id}`);

    expect(seenByBen.body.user.email).toBeUndefined();
    expect(seenByAsha.body.user.email).toBe('asha@example.com');
  });

  it('lets_a_user_edit_their_own_profile_only_with_known_fields', async () => {
    const { app } = startApp();
    const asha = await signUp(app, 'Asha');

    const res = await asha.patch('/api/users/me', {
      bio: 'Solo trekker',
      interests: ['Trekking'],
      role: 'ADMIN',
    });

    expect(res.body.user).toMatchObject({
      bio: 'Solo trekker',
      interests: ['trekking'],
      role: 'USER',
    });
  });
});

describe('Accounts against real Postgres', () => {
  it('lets_exactly_one_of_two_simultaneous_sign_ups_with_the_same_email_win', async () => {
    const { app } = startApp();
    const body = { name: 'Asha Rao', email: 'asha@example.com', password: 'longenough1' };

    const results = await Promise.all([
      request(app).post('/api/auth/register').send(body),
      request(app).post('/api/auth/register').send(body),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.user.count()).toBe(1);
  });

  it('hashes_the_password_with_bcrypt_and_logs_in_with_it', async () => {
    const { app } = startApp();
    await signUp(app, 'Asha');

    const stored = await prisma.user.findFirst();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'longenough1' });

    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(login.status).toBe(200);
  });

  it('refuses_login_for_a_deactivated_account', async () => {
    const { app } = startApp();
    await signUp(app, 'Asha');
    await prisma.user.updateMany({ data: { active: false } });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'longenough1' });

    expect(login.status).toBe(403);
  });
});
