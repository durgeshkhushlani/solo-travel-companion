import { PlanStatus } from './enums.js';
import { DomainError, ErrorCode } from './errors.js';

// Rule 3 (Auto-Close): a Travel Plan has started from its start date itself, not the day after.
export function hasStarted(plan, now) {
  return now.getTime() >= plan.startDate.getTime();
}

// Max Companions minus accepted Companions; null when the plan has no limit.
export function spotsLeft(plan, acceptedCount) {
  if (!Number.isInteger(plan.maxCompanions)) return null;
  return Math.max(plan.maxCompanions - acceptedCount, 0);
}

// The Plan Status a plan should have right now. A plan the Host closed stays CLOSED.
export function statusFor(plan, acceptedCount, now) {
  if (plan.status === PlanStatus.CLOSED || hasStarted(plan, now)) return PlanStatus.CLOSED;
  return spotsLeft(plan, acceptedCount) === 0 ? PlanStatus.FULL : PlanStatus.OPEN;
}

export function assertAcceptingRequests(plan, acceptedCount, now) {
  const status = statusFor(plan, acceptedCount, now);
  if (status === PlanStatus.CLOSED) {
    throw new DomainError(ErrorCode.PLAN_CLOSED, 'This Travel Plan is closed', 409);
  }
  if (status === PlanStatus.FULL) {
    throw new DomainError(ErrorCode.PLAN_FULL, 'This Travel Plan has no Spots Left', 409);
  }
}

// Rule 1: accepting one more Companion is refused at the limit; reaching the limit sets FULL.
// Returns the Plan Status after the new Companion joins.
export function statusAfterAccepting(plan, acceptedCount, now) {
  assertAcceptingRequests(plan, acceptedCount, now);
  return statusFor(plan, acceptedCount + 1, now);
}

// Rule 2 (Host decides) and every Host-only action: the actor must be the plan's Host.
export function assertHost(plan, actorId) {
  if (plan.hostId !== actorId) {
    throw new DomainError(ErrorCode.NOT_HOST, 'Only the Host can do this', 403);
  }
}

export function assertStartsInFuture(plan, now) {
  if (hasStarted(plan, now)) {
    throw new DomainError(ErrorCode.PLAN_IN_PAST, 'The start date must be in the future', 400);
  }
}

// Lowering Max Companions below the Companions already accepted would break rule 1.
export function assertLimitNotBelowAccepted(maxCompanions, acceptedCount) {
  if (Number.isInteger(maxCompanions) && maxCompanions < acceptedCount) {
    throw new DomainError(
      ErrorCode.LIMIT_BELOW_ACCEPTED,
      `${acceptedCount} Companions are already accepted`,
      409,
    );
  }
}
