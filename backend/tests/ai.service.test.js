import { describe, it, expect } from 'vitest';
import { createAiService } from '../src/services/ai.service.js';
import { AiError, AiErrorCode } from '../src/ai/ports.js';
import { ErrorCode } from '../src/domain/errors.js';
import { createWorld } from './helpers/world.js';
import { callTool, createScriptedLlm, say } from './helpers/aiFakes.js';

// Deterministic Embedder: a 2-dimension vector, [mentions "trek", mentions "food"].
function createFakeEmbedder({ down = false } = {}) {
  const calls = [];
  return {
    calls,
    async embed(text) {
      calls.push(text);
      if (down) throw new AiError(AiErrorCode.AI_UNAVAILABLE, 'down');
      const t = text.toLowerCase();
      return [t.includes('trek') ? 1 : 0, t.includes('food') ? 1 : 0];
    },
  };
}

function setup({ script = [], embedder = createFakeEmbedder() } = {}) {
  const world = createWorld();
  const host = world.addUser({ id: 'host-1', name: 'Ravi' });
  const asha = world.addUser({ id: 'asha-1', name: 'Asha', interests: ['trek'] });
  const llm = createScriptedLlm(script);
  const service = createAiService({ repos: world.repos, llm, embedder, clock: world.clock });
  return { world, host, asha, llm, embedder, service };
}

describe('AI service: itinerary', () => {
  it('returns_the_generated_days_for_valid_input', async () => {
    const days = { days: [{ day: 1, title: 'Arrive', activities: ['Walk'] }] };
    const { service } = setup({ script: [say(JSON.stringify(days))] });

    const result = await service.itinerary({
      destination: 'Goa',
      startDate: new Date('2027-03-01'),
      endDate: new Date('2027-03-01'),
      interests: [],
    });

    expect(result).toEqual({ itinerary: days.days });
  });

  it('refuses_an_end_date_before_the_start_date_without_calling_the_model', async () => {
    const { service, llm } = setup();

    await expect(
      service.itinerary({
        destination: 'Goa',
        startDate: new Date('2027-03-05'),
        endDate: new Date('2027-03-01'),
      }),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_DATES });
    expect(llm.requests).toHaveLength(0);
  });
});

describe('AI service: recommendations', () => {
  it('ranks_the_plan_that_matches_the_users_interests_first_and_explains_why', async () => {
    const { world, asha, service } = setup();
    world.addPlan({ id: 'plan-food', title: 'Food crawl', interests: ['food'] });
    world.addPlan({ id: 'plan-trek', title: 'Trek to base camp', interests: ['trek'] });

    const items = await service.recommendations(asha.id);

    expect(items.map((i) => i.plan.id)).toEqual(['plan-trek', 'plan-food']);
    expect(items[0].reason).toMatch(/shared interest/);
    expect(items[0].score).toBeGreaterThan(items[1].score);
  });

  it('leaves_out_plans_the_user_hosts', async () => {
    const { world, host, service } = setup();
    world.addPlan({ id: 'mine', hostId: host.id });

    expect(await service.recommendations(host.id)).toEqual([]);
  });

  it('stores_new_embeddings_and_reuses_them_on_the_next_call', async () => {
    const { world, asha, embedder, service } = setup();
    world.addPlan({ id: 'plan-trek', title: 'Trek', interests: ['trek'] });

    await service.recommendations(asha.id);
    const callsAfterFirst = embedder.calls.length;
    await service.recommendations(asha.id);

    expect(callsAfterFirst).toBe(2); // one plan and one profile
    expect(embedder.calls).toHaveLength(callsAfterFirst);
    expect(world.repos.embeddings.plans.has('plan-trek')).toBe(true);
  });

  it('still_ranks_by_interests_when_the_embedder_is_down', async () => {
    const { world, asha, service } = setup({ embedder: createFakeEmbedder({ down: true }) });
    world.addPlan({ id: 'plan-food', interests: ['food'] });
    world.addPlan({ id: 'plan-trek', interests: ['trek'] });

    const items = await service.recommendations(asha.id);

    expect(items[0].plan.id).toBe('plan-trek');
  });

  it('creates_at_most_fifteen_new_plan_embeddings_per_request', async () => {
    const { world, asha, embedder, service } = setup();
    for (let i = 0; i < 20; i += 1) world.addPlan({ id: `p${i}`, title: `Trip ${i}` });

    await service.recommendations(asha.id);

    expect(embedder.calls.filter((t) => t.startsWith('Trip:'))).toHaveLength(15);
  });
});

describe('AI service: matches', () => {
  function withTravelers() {
    const ctx = setup();
    const plan = ctx.world.addPlan({ id: 'plan-1', title: 'Trek', interests: ['trek'] });
    const dev = ctx.world.addUser({ id: 'dev-1', name: 'Dev', interests: ['food'] });
    return { ...ctx, plan, dev };
  }

  it('ranks_travelers_who_share_interests_first_and_never_includes_the_host', async () => {
    const { host, plan, asha, service } = withTravelers();

    const items = await service.matches(host.id, plan.id);

    expect(items[0].user.id).toBe(asha.id);
    expect(items.map((i) => i.user.id)).not.toContain(host.id);
  });

  it('leaves_out_companions_blocked_users_and_deactivated_users', async () => {
    const { world, host, plan, asha, dev, service } = withTravelers();
    const gone = world.addUser({ id: 'gone-1', active: false, interests: ['trek'] });
    world.addCompanion(plan.id, asha.id);
    await world.repos.blocks.add(host.id, dev.id);

    const items = await service.matches(host.id, plan.id);

    expect(items.map((i) => i.user.id)).not.toContain(asha.id);
    expect(items.map((i) => i.user.id)).not.toContain(dev.id);
    expect(items.map((i) => i.user.id)).not.toContain(gone.id);
  });

  it('does_not_expose_email_or_password_hash', async () => {
    const { host, plan, service } = withTravelers();

    const items = await service.matches(host.id, plan.id);

    expect(JSON.stringify(items)).not.toMatch(/email|passwordHash/);
  });

  it('refuses_anyone_but_the_host', async () => {
    const { asha, plan, service } = withTravelers();

    await expect(service.matches(asha.id, plan.id)).rejects.toMatchObject({
      code: ErrorCode.NOT_HOST,
    });
  });

  it('answers_not_found_for_an_unknown_plan', async () => {
    const { host, service } = setup();

    await expect(service.matches(host.id, 'missing')).rejects.toMatchObject({ status: 404 });
  });
});

describe('AI service: assistant', () => {
  it('answers_from_the_model_and_maps_the_assistant_role_to_model', async () => {
    const { asha, llm, service } = setup({ script: [say('Hello!')] });

    const result = await service.assistant(asha.id, [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'plans?' },
    ]);

    expect(result.reply).toBe('Hello!');
    expect(llm.requests[0].messages.map((m) => m.role)).toEqual(['user', 'model', 'user']);
  });

  it('lets_the_model_search_plans_through_a_tool', async () => {
    const { world, asha, llm, service } = setup({
      script: [callTool('search_plans', { destination: 'Spiti' }), say('Found one')],
    });
    world.addPlan({ id: 'plan-1', title: 'Spiti in March' });

    const result = await service.assistant(asha.id, [{ role: 'user', content: 'Spiti?' }]);

    expect(result).toMatchObject({ reply: 'Found one', steps: 2 });
    const toolTurn = llm.requests[1].messages.find((m) => m.role === 'tool');
    expect(toolTurn.result.items[0]).toMatchObject({ id: 'plan-1' });
  });
});
