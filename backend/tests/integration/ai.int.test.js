import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { AiError, AiErrorCode } from '../../src/ai/ports.js';
import { callTool, createScriptedLlm, say } from '../helpers/aiFakes.js';
import { planInput, prisma, resetDatabase, signUp, startApp } from './harness.js';

const DIMENSIONS = 1536;
const ITINERARY_BODY = {
  destination: 'Goa',
  startDate: '2027-03-01T00:00:00.000Z',
  endDate: '2027-03-02T00:00:00.000Z',
};

// Deterministic 1536-dim Embedder: a unit vector pointing at the first topic the text mentions.
function topicEmbedder() {
  return {
    async embed(text) {
      const v = new Array(DIMENSIONS).fill(0);
      v[/trek/i.test(text) ? 0 : 1] = 1;
      return v;
    },
  };
}

const storedEmbedding = async (table, id) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT embedding IS NOT NULL AS present FROM "${table}" WHERE id = $1`,
    id,
  );
  return rows[0].present;
};

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('Embedding storage (pgvector)', () => {
  it('round_trips_a_1536_dimension_vector_for_plans_and_users', async () => {
    const { services, app } = startApp();
    const host = await signUp(app, 'Ravi');
    const plan = (await host.post('/api/plans', planInput())).body.plan;
    const vector = Array.from({ length: DIMENSIONS }, (_, i) => (i % 7) / 10);

    await services.repos.embeddings.setPlan(plan.id, vector);
    await services.repos.embeddings.setUser(host.id, vector);

    const plans = await services.repos.embeddings.getPlans([plan.id]);
    const users = await services.repos.embeddings.getUsers([host.id]);
    expect(plans.get(plan.id)).toHaveLength(DIMENSIONS);
    expect(plans.get(plan.id)[3]).toBeCloseTo(0.3, 5);
    expect(users.get(host.id)).toHaveLength(DIMENSIONS);
  });

  it('returns_nothing_for_rows_without_an_embedding_or_an_empty_id_list', async () => {
    const { services, app } = startApp();
    const host = await signUp(app, 'Ravi');

    expect((await services.repos.embeddings.getUsers([host.id])).size).toBe(0);
    expect((await services.repos.embeddings.getPlans([])).size).toBe(0);
  });
});

describe('Recommended for You', () => {
  it('stores_embeddings_on_first_use_and_clears_them_when_the_plan_or_profile_changes', async () => {
    const { app } = startApp({ embedder: topicEmbedder() });
    const host = await signUp(app, 'Ravi');
    const asha = await signUp(app, 'Asha');
    const plan = (await host.post('/api/plans', planInput({ title: 'Trek to base camp' }))).body
      .plan;

    // A profile with no text has nothing to embed, so give Asha one first.
    await asha.patch('/api/users/me', { bio: 'I love a good trek' });

    const res = await asha.get('/api/ai/recommendations');

    expect(res.status).toBe(200);
    expect(res.body.items[0].plan.id).toBe(plan.id);
    expect(await storedEmbedding('TravelPlan', plan.id)).toBe(true);
    expect(await storedEmbedding('User', asha.id)).toBe(true);

    await host.patch(`/api/plans/${plan.id}`, { title: 'Food walk' });
    await asha.patch('/api/users/me', { bio: 'I love markets and food' });

    expect(await storedEmbedding('TravelPlan', plan.id)).toBe(false);
    expect(await storedEmbedding('User', asha.id)).toBe(false);
  });

  it('still_returns_plans_ranked_by_interests_when_the_embedder_is_down', async () => {
    const down = {
      async embed() {
        throw new AiError(AiErrorCode.AI_UNAVAILABLE, 'down');
      },
    };
    const { app } = startApp({ embedder: down });
    const host = await signUp(app, 'Ravi');
    const asha = await signUp(app, 'Asha');
    await host.post('/api/plans', planInput());

    const res = await asha.get('/api/ai/recommendations');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe('Best Match', () => {
  it('lets_the_host_see_ranked_travelers_and_refuses_everyone_else', async () => {
    const { app } = startApp({ embedder: topicEmbedder() });
    const host = await signUp(app, 'Ravi');
    const asha = await signUp(app, 'Asha');
    const plan = (await host.post('/api/plans', planInput())).body.plan;

    const ok = await host.get(`/api/ai/plans/${plan.id}/matches`);
    const denied = await asha.get(`/api/ai/plans/${plan.id}/matches`);

    expect(ok.status).toBe(200);
    expect(ok.body.items.map((i) => i.user.id)).toEqual([asha.id]);
    expect(JSON.stringify(ok.body)).not.toMatch(/email|passwordHash/);
    expect(denied.status).toBe(403);
  });
});

describe('Itinerary Generator and Travel Assistant over HTTP', () => {
  it('returns_a_generated_itinerary', async () => {
    const days = {
      days: [
        { day: 1, title: 'Arrive', activities: ['Walk'] },
        { day: 2, title: 'Beach', activities: ['Swim'] },
      ],
    };
    const { app } = startApp({ llm: createScriptedLlm([say(JSON.stringify(days))]) });
    const host = await signUp(app, 'Ravi');

    const res = await host.post('/api/ai/itinerary', ITINERARY_BODY);

    expect(res.status).toBe(200);
    expect(res.body.itinerary).toEqual(days.days);
  });

  it('answers_502_when_the_model_keeps_returning_unusable_output', async () => {
    const { app } = startApp({ llm: createScriptedLlm([say('nope'), say('still nope')]) });
    const host = await signUp(app, 'Ravi');

    const res = await host.post('/api/ai/itinerary', ITINERARY_BODY);

    expect(res.status).toBe(502);
  });

  it('answers_503_when_the_model_is_unavailable', async () => {
    const llm = createScriptedLlm([new AiError(AiErrorCode.AI_UNAVAILABLE, 'no key')]);
    const { app } = startApp({ llm });
    const host = await signUp(app, 'Ravi');

    const res = await host.post('/api/ai/itinerary', ITINERARY_BODY);

    expect(res.status).toBe(503);
  });

  it('requires_a_session_and_a_valid_body', async () => {
    const { app } = startApp({ llm: createScriptedLlm([]) });
    const host = await signUp(app, 'Ravi');

    const bad = await host.post('/api/ai/assistant', {
      messages: [{ role: 'assistant', content: 'hi' }],
    });
    const anonymous = await request(app).get('/api/ai/recommendations');

    expect(bad.status).toBe(400);
    expect(anonymous.status).toBe(401);
  });

  it('lets_the_assistant_search_real_plans_with_a_tool_call', async () => {
    const llm = createScriptedLlm([
      callTool('search_plans', { destination: 'Spiti' }),
      say('Found Spiti'),
    ]);
    const { app } = startApp({ llm });
    const host = await signUp(app, 'Ravi');
    const asha = await signUp(app, 'Asha');
    const plan = (await host.post('/api/plans', planInput())).body.plan;

    const res = await asha.post('/api/ai/assistant', {
      messages: [{ role: 'user', content: 'Spiti?' }],
    });

    expect(res.body).toMatchObject({ reply: 'Found Spiti', steps: 2 });
    const toolTurn = llm.requests[1].messages.find((m) => m.role === 'tool');
    expect(toolTurn.result.items.map((p) => p.id)).toEqual([plan.id]);
  });
});
