import { RequestStatus } from './enums.js';
import { DomainError, ErrorCode } from './errors.js';
import { assertNotBlocked } from './block.js';
import { assertAcceptingRequests, assertHost } from './plan.js';

export const JoinAction = Object.freeze({ CREATE: 'CREATE', REOPEN: 'REOPEN' });

// What sending a Join Request should do. `existing` is this User's earlier request on the plan.
// A cancelled request is reopened (one row per User and plan); anything else blocks a new one.
export function decideJoinRequest({ plan, userId, acceptedCount, now, existing, blockedByHost }) {
  if (userId === plan.hostId) {
    throw new DomainError(ErrorCode.HOST_CANNOT_JOIN, 'A Host cannot join their own plan', 400);
  }
  assertNotBlocked(blockedByHost);
  if (existing && existing.status !== RequestStatus.CANCELLED) {
    throw new DomainError(ErrorCode.ALREADY_REQUESTED, 'You already have a Join Request', 409);
  }
  assertAcceptingRequests(plan, acceptedCount, now);
  return existing ? JoinAction.REOPEN : JoinAction.CREATE;
}

function assertPending(request) {
  if (request.status !== RequestStatus.PENDING) {
    throw new DomainError(
      ErrorCode.REQUEST_NOT_PENDING,
      'This Join Request was already decided',
      409,
    );
  }
}

// Rule 2: only the Host decides, and only on a pending request.
export function assertCanDecide({ plan, request, actorId }) {
  assertHost(plan, actorId);
  assertPending(request);
}

// Only the requester can Cancel, and only while it is pending.
export function assertCanCancel({ request, actorId }) {
  if (request.userId !== actorId) {
    throw new DomainError(ErrorCode.NOT_REQUESTER, 'Only the requester can cancel', 403);
  }
  assertPending(request);
}
