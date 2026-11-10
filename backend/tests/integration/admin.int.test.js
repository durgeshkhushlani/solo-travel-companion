import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { planInput, prisma, resetDatabase, signUp, startApp } from './harness.js';

afterAll(() => prisma.$disconnect());
beforeEach(resetDatabase);

// Admins are made out of band (scripts/makeAdmin.js); the role is read from the token at login.
async function loginAsAdmin(app) {
  await signUp(app, 'Root');
  await prisma.user.updateMany({ where: { email: 'root@example.com' }, data: { role: 'ADMIN' } });
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/login')
    .send({ email: 'root@example.com', password: 'longenough1' });
  const csrf = res.headers['set-cookie']
    .find((c) => c.startsWith('stc_csrf='))
    .split(';')[0]
    .split('=')[1];
  return {
    id: res.body.user.id,
    get: (url) => agent.get(url),
    patch: (url, body) => agent.patch(url).set('x-csrf-token', csrf).send(body),
    delete: (url) => agent.delete(url).set('x-csrf-token', csrf),
  };
}

describe('Admin Panel over HTTP', () => {
  it('refuses_admin_routes_to_an_ordinary_user_and_to_visitors', async () => {
    const { app } = startApp();
    const asha = await signUp(app, 'Asha');

    const ordinary = await asha.get('/api/admin/stats');
    const visitor = await request(app).get('/api/admin/stats');

    expect([ordinary.status, visitor.status]).toEqual([403, 401]);
  });

  it('shows_platform_stats_and_the_user_list_to_an_admin', async () => {
    const { app } = startApp();
    const admin = await loginAsAdmin(app);
    const ravi = await signUp(app, 'Ravi');
    await ravi.post('/api/plans', planInput());

    const stats = await admin.get('/api/admin/stats');
    const users = await admin.get('/api/admin/users');

    expect(stats.body).toEqual({ users: 2, plans: 1, requests: 0, messages: 0 });
    expect(users.body.items.map((u) => u.name).sort()).toEqual(['Ravi', 'Root']);
    expect(JSON.stringify(users.body)).not.toContain('passwordHash');
  });

  it('cuts_off_a_session_that_is_already_open_when_the_admin_deactivates_the_user', async () => {
    const { app } = startApp();
    const admin = await loginAsAdmin(app);
    const asha = await signUp(app, 'Asha');
    const before = await asha.get('/api/plans');

    await admin.patch(`/api/admin/users/${asha.id}`, { active: false });
    const after = await asha.get('/api/plans');
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'longenough1' });

    expect(before.status).toBe(200);
    expect(after.status).toBe(401);
    expect(login.status).toBe(403);
  });

  it('lets_a_reactivated_user_log_in_again_with_their_data_intact', async () => {
    const { app } = startApp();
    const admin = await loginAsAdmin(app);
    const ravi = await signUp(app, 'Ravi');
    await ravi.post('/api/plans', planInput());
    await admin.patch(`/api/admin/users/${ravi.id}`, { active: false });
    await admin.patch(`/api/admin/users/${ravi.id}`, { active: true });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ravi@example.com', password: 'longenough1' });

    expect(login.status).toBe(200);
    expect(await prisma.travelPlan.count()).toBe(1);
  });

  it('refuses_an_admin_deactivating_themselves', async () => {
    const { app } = startApp();
    const admin = await loginAsAdmin(app);

    const res = await admin.patch(`/api/admin/users/${admin.id}`, { active: false });

    expect(res.status).toBe(400);
  });

  it('lets_an_admin_remove_a_plan_for_moderation', async () => {
    const { app } = startApp();
    const admin = await loginAsAdmin(app);
    const ravi = await signUp(app, 'Ravi');
    const { body } = await ravi.post('/api/plans', planInput());

    const listed = await admin.get('/api/admin/plans');
    const removed = await admin.delete(`/api/admin/plans/${body.plan.id}`);

    expect(listed.body.items).toHaveLength(1);
    expect(removed.status).toBe(204);
    expect(await prisma.travelPlan.count()).toBe(0);
  });

  it('rejects_a_body_that_is_not_a_boolean_flag', async () => {
    const { app } = startApp();
    const admin = await loginAsAdmin(app);

    const res = await admin.patch(`/api/admin/users/${admin.id}`, { active: 'no' });

    expect(res.status).toBe(400);
  });
});
