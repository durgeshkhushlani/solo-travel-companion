import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildTestApp } from './helpers/app.js';

const asha = { name: 'Asha Rao', email: 'asha@example.com', password: 'longenough1' };

const cookieNamed = (res, name) =>
  (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`));

const csrfOf = (res) => cookieNamed(res, 'stc_csrf').split(';')[0].split('=')[1];

async function registeredAgent(options) {
  const { app, users } = buildTestApp(options);
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(asha);
  return { app, users, agent, res };
}

describe('POST /api/auth/register', () => {
  it('creates_the_user_and_starts_a_session_with_an_httponly_cookie', async () => {
    const { res } = await registeredAgent();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Asha Rao', email: 'asha@example.com' });
    expect(cookieNamed(res, 'stc_token')).toMatch(/HttpOnly/i);
    expect(cookieNamed(res, 'stc_csrf')).not.toMatch(/HttpOnly/i);
  });

  it('never_returns_the_password_or_its_hash', async () => {
    const { res } = await registeredAgent();

    const body = JSON.stringify(res.body);

    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain(asha.password);
  });

  it('ignores_a_role_sent_by_the_client', async () => {
    const { app } = buildTestApp();

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...asha, role: 'ADMIN' });

    expect(res.body.user.role).toBe('USER');
  });

  it('answers_400_with_details_when_the_input_is_invalid', async () => {
    const { app } = buildTestApp();

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...asha, password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.details.fieldErrors).toHaveProperty('password');
  });

  it('answers_409_when_the_email_is_already_registered', async () => {
    const { app } = await registeredAgent();

    const res = await request(app).post('/api/auth/register').send(asha);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('That email is already registered');
  });
});

describe('POST /api/auth/login', () => {
  it('starts_a_session_for_the_right_password_whatever_the_email_case', async () => {
    const { app } = await registeredAgent();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ASHA@example.com', password: asha.password });

    expect(res.status).toBe(200);
    expect(cookieNamed(res, 'stc_token')).toBeDefined();
  });

  it('answers_401_for_a_wrong_password_without_starting_a_session', async () => {
    const { app } = await registeredAgent();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: asha.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(cookieNamed(res, 'stc_token')).toBeUndefined();
  });

  it('answers_403_for_a_deactivated_account', async () => {
    const { app, users } = await registeredAgent();
    users.rows[0].active = false;

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: asha.email, password: asha.password });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  it('answers_401_without_a_session', async () => {
    const { app } = buildTestApp();

    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns_the_logged_in_user_with_their_own_email', async () => {
    const { agent } = await registeredAgent();

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(asha.email);
  });

  it('answers_401_once_the_account_has_been_deactivated', async () => {
    const { agent, users } = await registeredAgent();
    users.rows[0].active = false;

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('is_refused_without_the_csrf_header', async () => {
    const { agent } = await registeredAgent();

    const res = await agent.post('/api/auth/logout');

    expect(res.status).toBe(403);
  });

  it('ends_the_session_when_the_csrf_header_matches', async () => {
    const { agent, res: registered } = await registeredAgent();

    const out = await agent.post('/api/auth/logout').set('x-csrf-token', csrfOf(registered));
    const afterwards = await agent.get('/api/auth/me');

    expect(out.status).toBe(204);
    expect(afterwards.status).toBe(401);
  });
});
