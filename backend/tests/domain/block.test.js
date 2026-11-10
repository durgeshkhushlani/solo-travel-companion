import { describe, it, expect } from 'vitest';
import { assertCanBlock, assertNotBlocked } from '../../src/domain/block.js';
import { ErrorCode } from '../../src/domain/errors.js';

describe('Block (rule 4)', () => {
  it('lets_contact_through_when_the_receiver_has_not_blocked_the_sender', () => {
    expect(() => assertNotBlocked(false)).not.toThrow();
  });

  it('refuses_contact_with_403_when_the_receiver_has_blocked_the_sender', () => {
    expect(() => assertNotBlocked(true)).toThrowError(
      expect.objectContaining({ code: ErrorCode.BLOCKED, status: 403 }),
    );
  });

  it('refuses_blocking_yourself', () => {
    expect(() => assertCanBlock('u1', 'u1')).toThrowError(
      expect.objectContaining({ code: ErrorCode.SELF_ACTION }),
    );
  });

  it('allows_blocking_someone_else', () => {
    expect(() => assertCanBlock('u1', 'u2')).not.toThrow();
  });
});
