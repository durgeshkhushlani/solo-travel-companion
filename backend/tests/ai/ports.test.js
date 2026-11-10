import { describe, it, expect } from 'vitest';
import { AiError, AiErrorCode, aiBadOutput, aiUnavailable } from '../../src/ai/ports.js';

describe('AiError', () => {
  it.each([
    [AiErrorCode.AI_UNAVAILABLE, aiUnavailable(), 503],
    [AiErrorCode.AI_BAD_OUTPUT, aiBadOutput(), 502],
  ])('%s_maps_to_http_status_%s', (code, error, status) => {
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
  });

  it('is_exposed_to_the_client_like_a_domain_error', () => {
    expect(aiUnavailable().expose).toBe(true);
  });

  it('is_a_named_error_carrying_its_message', () => {
    const error = aiBadOutput('nope');
    expect(error).toBeInstanceOf(AiError);
    expect(error.name).toBe('AiError');
    expect(error.message).toBe('nope');
  });
});
