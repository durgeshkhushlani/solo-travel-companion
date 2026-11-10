import { DomainError, ErrorCode } from './errors.js';

// An Admin cannot deactivate their own account: it would lock the last Admin out.
export function assertCanChangeActive(actorId, targetId, active) {
  if (actorId === targetId && active === false) {
    throw new DomainError(ErrorCode.SELF_ACTION, 'You cannot deactivate your own account', 400);
  }
}
