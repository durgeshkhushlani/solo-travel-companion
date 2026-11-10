import { describe, it, expect } from 'vitest';
import { errorMessage } from './errors.js';

describe('errorMessage', () => {
  it('returns_the_error_text_sent_by_the_server', () => {
    const err = { response: { status: 409, data: { error: 'Plan is full' } } };
    expect(errorMessage(err)).toBe('Plan is full');
  });

  it('reports_an_unreachable_server_when_there_was_no_response', () => {
    expect(errorMessage({ request: {} })).toBe('Cannot reach the server.');
  });

  it('uses_the_fallback_when_the_server_sent_no_error_field', () => {
    const err = { response: { status: 500, data: {} } };
    expect(errorMessage(err, 'Try later')).toBe('Try later');
  });

  it('uses_the_default_text_for_a_plain_error', () => {
    expect(errorMessage(new Error('boom'))).toMatch(/something went wrong/i);
  });
});
