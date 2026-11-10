import { describe, it, expect } from 'vitest';
import {
  JoinAction,
  assertCanCancel,
  assertCanDecide,
  decideJoinRequest,
} from '../../src/domain/request.js';
import { RequestStatus } from '../../src/domain/enums.js';
import { ErrorCode } from '../../src/domain/errors.js';
import { BEFORE_START, at, makePlan } from '../helpers/factories.js';

const base = () => ({
  plan: makePlan(),
  userId: 'asha-1',
  acceptedCount: 0,
  now: BEFORE_START,
  existing: null,
  blockedByHost: false,
});

// Returns the DomainError code a call throws, or null when it does not throw.
const codeOf = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.code;
  }
  return null;
};

describe('decideJoinRequest', () => {
  it('creates_a_request_for_a_first_time_applicant', () => {
    expect(decideJoinRequest(base())).toBe(JoinAction.CREATE);
  });

  it('reopens_a_request_the_user_cancelled_earlier', () => {
    const existing = { status: RequestStatus.CANCELLED };

    expect(decideJoinRequest({ ...base(), existing })).toBe(JoinAction.REOPEN);
  });

  it.each([RequestStatus.PENDING, RequestStatus.ACCEPTED, RequestStatus.REJECTED])(
    'refuses_a_second_request_when_the_first_is_%s',
    (status) => {
      const input = { ...base(), existing: { status } };

      expect(codeOf(() => decideJoinRequest(input))).toBe(ErrorCode.ALREADY_REQUESTED);
    },
  );

  it('refuses_the_host_joining_their_own_plan', () => {
    const input = { ...base(), userId: 'host-1' };

    expect(codeOf(() => decideJoinRequest(input))).toBe(ErrorCode.HOST_CANNOT_JOIN);
  });

  it('refuses_a_user_the_host_has_blocked_(rule_4)', () => {
    const input = { ...base(), blockedByHost: true };

    expect(codeOf(() => decideJoinRequest(input))).toBe(ErrorCode.BLOCKED);
  });

  it('refuses_a_request_on_a_full_plan', () => {
    const input = { ...base(), acceptedCount: 2 };

    expect(codeOf(() => decideJoinRequest(input))).toBe(ErrorCode.PLAN_FULL);
  });

  it('refuses_a_request_on_a_plan_that_has_started', () => {
    const input = { ...base(), now: at('2027-03-01T00:00:00.000Z') };

    expect(codeOf(() => decideJoinRequest(input))).toBe(ErrorCode.PLAN_CLOSED);
  });
});

describe('Host decides (rule 2)', () => {
  const pending = { status: RequestStatus.PENDING, userId: 'asha-1' };
  const decideAs = (actorId, request = pending) =>
    codeOf(() => assertCanDecide({ plan: makePlan(), request, actorId }));

  it('lets_the_host_decide_a_pending_request', () => {
    expect(decideAs('host-1')).toBeNull();
  });

  it.each(['asha-1', 'someone-else'])('refuses_%s_deciding_for_the_host', (actorId) => {
    expect(decideAs(actorId)).toBe(ErrorCode.NOT_HOST);
  });

  it.each([RequestStatus.ACCEPTED, RequestStatus.REJECTED, RequestStatus.CANCELLED])(
    'refuses_deciding_a_%s_request',
    (status) => {
      expect(decideAs('host-1', { ...pending, status })).toBe(ErrorCode.REQUEST_NOT_PENDING);
    },
  );
});

describe('assertCanCancel', () => {
  const pending = { status: RequestStatus.PENDING, userId: 'asha-1' };
  const cancelAs = (actorId, request = pending) =>
    codeOf(() => assertCanCancel({ request, actorId }));

  it('lets_the_requester_cancel_a_pending_request', () => {
    expect(cancelAs('asha-1')).toBeNull();
  });

  it('refuses_anyone_else_including_the_host', () => {
    expect(cancelAs('host-1')).toBe(ErrorCode.NOT_REQUESTER);
  });

  it('refuses_cancelling_a_request_that_was_already_accepted', () => {
    const accepted = { ...pending, status: RequestStatus.ACCEPTED };

    expect(cancelAs('asha-1', accepted)).toBe(ErrorCode.REQUEST_NOT_PENDING);
  });
});
