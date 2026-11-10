import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp({});

describe('health check', () => {
  it('reports_ok_when_the_server_is_running', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('answers_unknown_routes_with_404_and_a_json_error', async () => {
    const res = await request(app).get('/no-such-route');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
