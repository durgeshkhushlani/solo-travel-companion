// The only file that knows Gemini. It implements both ports (LlmClient and Embedder).
// NOTE: request shapes follow the public Gemini REST docs (v1beta generateContent / embedContent)
// and have not been exercised against the live API; tests use an injected fetch stub.
import { aiBadOutput, aiUnavailable } from './ports.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Our Message turns -> Gemini contents. A 'tool' turn is the model's call plus our answer to it.
function toContents(messages) {
  return messages.flatMap((m) => {
    if (m.role === 'tool') {
      return [
        { role: 'model', parts: [{ functionCall: { name: m.name, args: m.args ?? {} } }] },
        { role: 'user', parts: [{ functionResponse: { name: m.name, response: m.result } }] },
      ];
    }
    return [{ role: m.role, parts: [{ text: m.content }] }];
  });
}

function buildGenerateBody({ system, messages, tools, json }) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: toContents(messages),
  };
  if (tools?.length) body.tools = [{ functionDeclarations: tools }];
  if (json) body.generationConfig = { responseMimeType: 'application/json' };
  return body;
}

// Gemini answer -> { text, toolCalls }. Anything else is AI_BAD_OUTPUT.
function parseGenerateResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) throw aiBadOutput('The AI service returned no answer');
  const text = parts
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  const toolCalls = parts
    .filter((p) => p.functionCall)
    .map((p) => ({ name: p.functionCall.name, args: p.functionCall.args ?? {} }));
  if (!text && toolCalls.length === 0) throw aiBadOutput('The AI service returned an empty answer');
  return { text, toolCalls };
}

function parseEmbedResponse(data, dimensions) {
  const values = data?.embedding?.values;
  const isNumbers = Array.isArray(values) && values.every((v) => typeof v === 'number');
  if (!isNumbers || values.length !== dimensions) {
    throw aiBadOutput('The AI service returned an unusable embedding');
  }
  return values;
}

export function createGeminiClient({
  apiKey,
  model,
  embeddingModel,
  embeddingDimensions = 1536,
  fetchFn = fetch,
}) {
  // Quota, outage, network failure and a missing or rejected key all look the same to callers.
  async function post(modelName, method, body) {
    if (!apiKey) throw aiUnavailable('The AI service is not configured');
    let response;
    try {
      response = await fetchFn(`${BASE_URL}/${modelName}:${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      });
    } catch {
      throw aiUnavailable();
    }
    if (!response.ok) throw aiUnavailable();
    try {
      return await response.json();
    } catch {
      throw aiBadOutput('The AI service returned an unreadable response');
    }
  }

  return {
    async generate(request) {
      return parseGenerateResponse(
        await post(model, 'generateContent', buildGenerateBody(request)),
      );
    },

    async embed(text) {
      const data = await post(embeddingModel, 'embedContent', {
        content: { parts: [{ text }] },
        outputDimensionality: embeddingDimensions,
      });
      return parseEmbedResponse(data, embeddingDimensions);
    },
  };
}
