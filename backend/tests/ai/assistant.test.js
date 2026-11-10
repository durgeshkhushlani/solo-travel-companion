import { describe, it, expect } from 'vitest';
import { STEP_LIMIT_REPLY, runAssistant } from '../../src/ai/assistant/assistant.js';
import { buildAssistantTools } from '../../src/ai/assistant/tools.js';
import { AiErrorCode, aiUnavailable } from '../../src/ai/ports.js';
import { BEFORE_START, makePlan } from '../helpers/factories.js';
import { callTool, createScriptedLlm, say } from '../helpers/aiFakes.js';

const question = [{ role: 'user', content: 'Any trips to Goa?' }];
const echoTool = {
  name: 'echo',
  description: 'Echoes its arguments',
  parameters: { type: 'object', properties: {} },
  run: async (args) => ({ echoed: args }),
};

describe('runAssistant', () => {
  it('returns_the_text_answer_in_one_step_when_no_tool_is_needed', async () => {
    const llm = createScriptedLlm([say('Hello!')]);

    const result = await runAssistant({ llm, tools: [echoTool], messages: question });

    expect(result).toEqual({ reply: 'Hello!', steps: 1 });
  });

  it('runs_the_requested_tool_and_shows_its_result_to_the_model', async () => {
    const llm = createScriptedLlm([callTool('echo', { a: 1 }), say('Done')]);

    const result = await runAssistant({ llm, tools: [echoTool], messages: question });

    const toolTurn = llm.requests[1].messages.at(-1);
    expect(result).toEqual({ reply: 'Done', steps: 2 });
    expect(toolTurn).toEqual({
      role: 'tool',
      name: 'echo',
      args: { a: 1 },
      result: { echoed: { a: 1 } },
    });
  });

  it('offers_the_model_tool_declarations_without_the_run_function', async () => {
    const llm = createScriptedLlm([say('ok')]);

    await runAssistant({ llm, tools: [echoTool], messages: question });

    expect(llm.requests[0].tools).toEqual([
      { name: 'echo', description: echoTool.description, parameters: echoTool.parameters },
    ]);
  });

  it('feeds_an_error_result_back_for_an_unknown_tool_and_continues', async () => {
    const llm = createScriptedLlm([callTool('delete_everything'), say('I cannot do that')]);

    const result = await runAssistant({ llm, tools: [echoTool], messages: question });

    expect(llm.requests[1].messages.at(-1).result).toEqual({
      error: 'unknown tool "delete_everything"',
    });
    expect(result.reply).toBe('I cannot do that');
  });

  it('feeds_back_a_generic_error_when_a_tool_throws_never_the_stack', async () => {
    const broken = {
      ...echoTool,
      run: async () => {
        throw new Error('db password=hunter2 at /srv/x.js:1');
      },
    };
    const llm = createScriptedLlm([callTool('echo'), say('Sorry')]);

    await runAssistant({ llm, tools: [broken], messages: question });

    const fed = JSON.stringify(llm.requests[1].messages.at(-1).result);
    expect(fed).toBe('{"error":"the tool failed"}');
  });

  it('runs_every_tool_call_of_one_model_answer', async () => {
    const twoCalls = {
      toolCalls: [
        { name: 'echo', args: { n: 1 } },
        { name: 'echo', args: { n: 2 } },
      ],
    };
    const llm = createScriptedLlm([twoCalls, say('Both')]);

    await runAssistant({ llm, tools: [echoTool], messages: question });

    expect(llm.requests[1].messages.filter((m) => m.role === 'tool')).toHaveLength(2);
  });

  it('does_not_change_the_callers_messages', async () => {
    const llm = createScriptedLlm([callTool('echo'), say('Done')]);

    await runAssistant({ llm, tools: [echoTool], messages: question });

    expect(question).toHaveLength(1);
  });

  it('passes_unavailable_through', async () => {
    const llm = createScriptedLlm([aiUnavailable()]);

    await expect(runAssistant({ llm, tools: [], messages: question })).rejects.toMatchObject({
      code: AiErrorCode.AI_UNAVAILABLE,
    });
  });

  describe('step limit', () => {
    it('accepts_a_text_answer_given_on_the_last_allowed_step', async () => {
      const llm = createScriptedLlm([callTool('echo'), callTool('echo'), say('Just in time')]);

      const result = await runAssistant({
        llm,
        tools: [echoTool],
        messages: question,
        maxSteps: 3,
      });

      expect(result).toEqual({ reply: 'Just in time', steps: 3 });
    });

    it('returns_the_fixed_fallback_when_the_last_allowed_step_still_asks_for_a_tool', async () => {
      const llm = createScriptedLlm([
        callTool('echo'),
        callTool('echo'),
        callTool('echo'),
        say('late'),
      ]);

      const result = await runAssistant({
        llm,
        tools: [echoTool],
        messages: question,
        maxSteps: 3,
      });

      expect(result).toEqual({ reply: STEP_LIMIT_REPLY, steps: 3 });
      expect(llm.requests).toHaveLength(3);
    });

    it('allows_5_steps_by_default', async () => {
      const llm = createScriptedLlm(new Array(6).fill(callTool('echo')));

      const result = await runAssistant({ llm, tools: [echoTool], messages: question });

      expect(result.steps).toBe(5);
      expect(llm.requests).toHaveLength(5);
    });
  });
});

describe('Assistant Tools', () => {
  const FORBIDDEN = ['email', 'passwordHash', 'requests', 'joinRequests', 'host'];
  const goa = makePlan({
    id: 'plan-goa',
    hostId: 'host-1',
    title: 'Goa beaches',
    destination: 'Goa',
    acceptedCount: 1,
    host: { email: 'host@example.com', passwordHash: 'x' },
    requests: [{ userId: 'u-9', status: 'PENDING' }],
    itinerary: [
      { day: 1, title: 'Arrive', activities: ['Beach'] },
      { day: 2, title: 'Fort', activities: ['Walk'] },
    ],
  });
  const fakePlans = (rows) => ({
    searched: [],
    async search(filters) {
      this.searched.push(filters);
      return rows;
    },
    async findById(id) {
      return rows.find((p) => p.id === id) ?? null;
    },
  });
  const toolsFor = (plans, viewerId = 'viewer-1') =>
    Object.fromEntries(
      buildAssistantTools({ plans, now: BEFORE_START, viewerId }).map((t) => [t.name, t]),
    );

  it('offers_search_plans_and_get_plan_summary', () => {
    const names = buildAssistantTools({
      plans: fakePlans([]),
      now: BEFORE_START,
      viewerId: 'v',
    }).map((t) => t.name);

    expect(names).toEqual(['search_plans', 'get_plan_summary']);
  });

  it('search_plans_returns_compact_items', async () => {
    const { search_plans } = toolsFor(fakePlans([goa]));

    const { items } = await search_plans.run({ destination: 'Goa' });

    expect(items).toEqual([
      {
        id: 'plan-goa',
        title: 'Goa beaches',
        destination: 'Goa',
        startDate: '2027-03-01T00:00:00.000Z',
        endDate: '2027-03-07T00:00:00.000Z',
        spotsLeft: 1,
        status: 'OPEN',
      },
    ]);
  });

  it('search_plans_passes_clean_filters_to_the_plan_port', async () => {
    const plans = fakePlans([]);

    await toolsFor(plans).search_plans.run({
      destination: ' Goa ',
      interest: 42,
      from: '2027-03-01',
      to: 'not a date',
    });

    expect(plans.searched[0]).toEqual({
      destination: 'Goa',
      interest: undefined,
      from: new Date('2027-03-01'),
      to: undefined,
    });
  });

  it.each([
    [4, 4],
    [5, 5],
    [6, 5],
    [12, 5],
  ])('search_plans_with_%i_matches_returns_%i_items', async (matches, expected) => {
    const rows = Array.from({ length: matches }, (_, i) =>
      makePlan({ id: `p-${i}`, title: 't', destination: 'd' }),
    );

    const { items } = await toolsFor(fakePlans(rows)).search_plans.run({});

    expect(items).toHaveLength(expected);
  });

  it('search_plans_leaves_out_plans_the_viewer_hosts', async () => {
    const own = makePlan({ id: 'own', hostId: 'viewer-1', title: 't', destination: 'd' });

    const { items } = await toolsFor(fakePlans([own, goa])).search_plans.run({});

    expect(items.map((i) => i.id)).toEqual(['plan-goa']);
  });

  it('get_plan_summary_adds_the_itinerary_day_titles', async () => {
    const summary = await toolsFor(fakePlans([goa])).get_plan_summary.run({ planId: 'plan-goa' });

    expect(summary).toMatchObject({ id: 'plan-goa', dayTitles: ['Arrive', 'Fort'] });
  });

  it.each([
    ['an unknown id', { planId: 'nope' }],
    ['a missing id', {}],
    ['an id that is not a string', { planId: 7 }],
  ])('get_plan_summary_says_not_found_for_%s', async (_label, args) => {
    const summary = await toolsFor(fakePlans([goa])).get_plan_summary.run(args);

    expect(summary).toEqual({ error: 'not found' });
  });

  it('never_returns_host_emails_join_requests_or_other_forbidden_fields', async () => {
    const tools = toolsFor(fakePlans([goa]));

    const searched = JSON.stringify(await tools.search_plans.run({}));
    const summary = JSON.stringify(await tools.get_plan_summary.run({ planId: 'plan-goa' }));

    for (const word of FORBIDDEN) {
      expect(searched).not.toContain(word);
      expect(summary).not.toContain(word);
    }
  });

  it('reports_a_full_plan_as_full_with_no_spots_left', async () => {
    const full = makePlan({
      id: 'f',
      title: 't',
      destination: 'd',
      maxCompanions: 2,
      acceptedCount: 2,
    });

    const { items } = await toolsFor(fakePlans([full])).search_plans.run({});

    expect(items[0]).toMatchObject({ spotsLeft: 0, status: 'FULL' });
  });
});

describe('Travel Assistant with its tools', () => {
  it('answers_after_looking_a_plan_up_through_a_tool', async () => {
    const plans = {
      search: async () => [
        makePlan({ id: 'p1', title: 'Goa', destination: 'Goa', acceptedCount: 0 }),
      ],
      findById: async () => null,
    };
    const tools = buildAssistantTools({ plans, now: BEFORE_START, viewerId: 'v' });
    const llm = createScriptedLlm([
      callTool('search_plans', { destination: 'Goa' }),
      say('Found Goa'),
    ]);

    const result = await runAssistant({ llm, tools, messages: question });

    expect(llm.requests[1].messages.at(-1).result.items[0].id).toBe('p1');
    expect(result.reply).toBe('Found Goa');
  });
});
