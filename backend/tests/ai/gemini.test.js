import { describe, it, expect } from 'vitest';
import { createGeminiClient } from '../../src/ai/gemini.js';
import { AiErrorCode } from '../../src/ai/ports.js';

// A fetch stub that records the call and answers with a canned JSON response.
function stubFetch(status, body) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fetchFn, calls };
}

const textAnswer = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const clientWith = (fetchFn, overrides = {}) =>
  createGeminiClient({
    apiKey: 'key-123',
    model: 'gemini-test',
    embeddingModel: 'embed-test',
    embeddingDimensions: 3,
    fetchFn,
    ...overrides,
  });
const request = { system: 'Be brief', messages: [{ role: 'user', content: 'Hi' }] };

describe('generate: request shape', () => {
  it('posts_to_the_generateContent_url_of_the_model_with_the_api_key_header', async () => {
    const { fetchFn, calls } = stubFetch(200, textAnswer('ok'));

    await clientWith(fetchFn).generate(request);

    expect(calls[0].url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
    );
    expect(calls[0].init.headers['x-goog-api-key']).toBe('key-123');
  });

  it('sends_the_system_text_as_systemInstruction_and_messages_as_contents', async () => {
    const { fetchFn, calls } = stubFetch(200, textAnswer('ok'));

    await clientWith(fetchFn).generate(request);

    expect(calls[0].body).toEqual({
      systemInstruction: { parts: [{ text: 'Be brief' }] },
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
    });
  });

  it('asks_for_json_through_responseMimeType_only_when_json_is_true', async () => {
    const { fetchFn, calls } = stubFetch(200, textAnswer('{}'));

    await clientWith(fetchFn).generate({ ...request, json: true });

    expect(calls[0].body.generationConfig).toEqual({ responseMimeType: 'application/json' });
  });

  it('declares_tools_as_functionDeclarations', async () => {
    const { fetchFn, calls } = stubFetch(200, textAnswer('ok'));
    const tool = { name: 'search_plans', description: 'd', parameters: { type: 'object' } };

    await clientWith(fetchFn).generate({ ...request, tools: [tool] });

    expect(calls[0].body.tools).toEqual([{ functionDeclarations: [tool] }]);
  });

  it('replays_a_tool_turn_as_the_model_call_followed_by_our_function_response', async () => {
    const { fetchFn, calls } = stubFetch(200, textAnswer('ok'));
    const toolTurn = {
      role: 'tool',
      name: 'search_plans',
      args: { destination: 'Goa' },
      result: { items: [] },
    };

    await clientWith(fetchFn).generate({ ...request, messages: [toolTurn] });

    expect(calls[0].body.contents).toEqual([
      {
        role: 'model',
        parts: [{ functionCall: { name: 'search_plans', args: { destination: 'Goa' } } }],
      },
      {
        role: 'user',
        parts: [{ functionResponse: { name: 'search_plans', response: { items: [] } } }],
      },
    ]);
  });
});

describe('generate: response parsing', () => {
  it('returns_the_text_with_no_tool_calls', async () => {
    const { fetchFn } = stubFetch(200, textAnswer('hello'));

    const answer = await clientWith(fetchFn).generate(request);

    expect(answer).toEqual({ text: 'hello', toolCalls: [] });
  });

  it('returns_function_calls_as_tool_calls', async () => {
    const body = {
      candidates: [{ content: { parts: [{ functionCall: { name: 'x', args: { a: 1 } } }] } }],
    };
    const { fetchFn } = stubFetch(200, body);

    const answer = await clientWith(fetchFn).generate(request);

    expect(answer).toEqual({ text: '', toolCalls: [{ name: 'x', args: { a: 1 } }] });
  });

  it.each([
    ['no candidates', {}],
    ['a candidate without parts', { candidates: [{ content: {} }] }],
    ['empty parts', { candidates: [{ content: { parts: [] } }] }],
  ])('rejects_%s_as_bad_output', async (_label, body) => {
    const { fetchFn } = stubFetch(200, body);

    await expect(clientWith(fetchFn).generate(request)).rejects.toMatchObject({
      code: AiErrorCode.AI_BAD_OUTPUT,
      status: 502,
    });
  });

  it('rejects_a_body_that_is_not_json_as_bad_output', async () => {
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    await expect(clientWith(fetchFn).generate(request)).rejects.toMatchObject({
      code: AiErrorCode.AI_BAD_OUTPUT,
    });
  });
});

describe('error mapping to AI_UNAVAILABLE', () => {
  it.each([[400], [403], [429], [500], [503]])('maps_http_%i_to_unavailable', async (status) => {
    const { fetchFn } = stubFetch(status, { error: { message: 'secret detail' } });

    await expect(clientWith(fetchFn).generate(request)).rejects.toMatchObject({
      code: AiErrorCode.AI_UNAVAILABLE,
      status: 503,
    });
  });

  it('maps_a_network_failure_to_unavailable', async () => {
    const fetchFn = async () => {
      throw new TypeError('fetch failed');
    };

    await expect(clientWith(fetchFn).generate(request)).rejects.toMatchObject({
      code: AiErrorCode.AI_UNAVAILABLE,
    });
  });

  it.each([[undefined], ['']])(
    'maps_a_missing_api_key_%j_to_unavailable_without_calling',
    async (apiKey) => {
      const { fetchFn, calls } = stubFetch(200, textAnswer('ok'));

      await expect(clientWith(fetchFn, { apiKey }).generate(request)).rejects.toMatchObject({
        code: AiErrorCode.AI_UNAVAILABLE,
      });
      expect(calls).toHaveLength(0);
    },
  );

  it('does_not_leak_the_upstream_error_message', async () => {
    const { fetchFn } = stubFetch(500, { error: { message: 'secret detail' } });

    await expect(clientWith(fetchFn).generate(request)).rejects.toThrow(/unavailable/i);
  });
});

describe('embed', () => {
  it('posts_to_the_embedContent_url_with_the_text_and_outputDimensionality', async () => {
    const { fetchFn, calls } = stubFetch(200, { embedding: { values: [0.1, 0.2, 0.3] } });

    await clientWith(fetchFn).embed('beach trip');

    expect(calls[0].url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/embed-test:embedContent',
    );
    expect(calls[0].body).toEqual({
      content: { parts: [{ text: 'beach trip' }] },
      outputDimensionality: 3,
    });
  });

  it('returns_the_embedding_values', async () => {
    const { fetchFn } = stubFetch(200, { embedding: { values: [0.1, 0.2, 0.3] } });

    expect(await clientWith(fetchFn).embed('x')).toEqual([0.1, 0.2, 0.3]);
  });

  it('defaults_to_1536_dimensions_to_match_the_pgvector_column', async () => {
    const { fetchFn, calls } = stubFetch(200, { embedding: { values: new Array(1536).fill(0) } });

    await clientWith(fetchFn, { embeddingDimensions: undefined }).embed('x');

    expect(calls[0].body.outputDimensionality).toBe(1536);
  });

  it.each([
    ['no embedding', {}],
    ['values that are not numbers', { embedding: { values: ['a', 'b', 'c'] } }],
    ['the wrong number of values', { embedding: { values: [1, 2] } }],
  ])('rejects_%s_as_bad_output', async (_label, body) => {
    const { fetchFn } = stubFetch(200, body);

    await expect(clientWith(fetchFn).embed('x')).rejects.toMatchObject({
      code: AiErrorCode.AI_BAD_OUTPUT,
    });
  });

  it('maps_http_429_to_unavailable', async () => {
    const { fetchFn } = stubFetch(429, {});

    await expect(clientWith(fetchFn).embed('x')).rejects.toMatchObject({
      code: AiErrorCode.AI_UNAVAILABLE,
    });
  });
});
