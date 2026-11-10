// Ports of the AI layer. The AI features depend on these shapes only;
// src/ai/gemini.js is the single adapter that knows a vendor.

/**
 * An Assistant Tool as the model sees it (no `run`).
 * @typedef {{ name: string, description: string, parameters: object }} ToolDeclaration
 */

/**
 * A conversation turn. 'tool' turns carry the result of an Assistant Tool call.
 * @typedef {{ role: 'user' | 'model' | 'tool', content?: string, name?: string, args?: object,
 *   result?: object }} Message
 */

/**
 * `json: true` asks for a JSON-only answer. `toolCalls` is empty when the model answered in text.
 * @typedef {{
 *   generate(request: {
 *     system: string,
 *     messages: Message[],
 *     tools?: ToolDeclaration[],
 *     json?: boolean
 *   }): Promise<{ text: string, toolCalls: { name: string, args: object }[] }>
 * }} LlmClient
 */

/**
 * @typedef {{ embed(text: string): Promise<number[]> }} Embedder
 */

export const AiErrorCode = Object.freeze({
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
  AI_BAD_OUTPUT: 'AI_BAD_OUTPUT',
});

// Same shape as DomainError (code, status, expose) so the HTTP error handler treats both alike.
export class AiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.status = code === AiErrorCode.AI_UNAVAILABLE ? 503 : 502;
    this.expose = true;
  }
}

export const aiUnavailable = (message = 'The AI service is unavailable right now') =>
  new AiError(AiErrorCode.AI_UNAVAILABLE, message);

export const aiBadOutput = (message = 'The AI service returned an unusable answer') =>
  new AiError(AiErrorCode.AI_BAD_OUTPUT, message);
