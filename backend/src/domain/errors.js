// Rule violations raised by the core. `status` and `expose` let the HTTP error handler
// answer with the right code and message without the core knowing about HTTP.
export const ErrorCode = Object.freeze({
  PLAN_FULL: 'PLAN_FULL',
  PLAN_CLOSED: 'PLAN_CLOSED',
  HOST_CANNOT_JOIN: 'HOST_CANNOT_JOIN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  BAD_CREDENTIALS: 'BAD_CREDENTIALS',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  NOT_FOUND: 'NOT_FOUND',
  NOT_HOST: 'NOT_HOST',
  NOT_REQUESTER: 'NOT_REQUESTER',
  ALREADY_REQUESTED: 'ALREADY_REQUESTED',
  REQUEST_NOT_PENDING: 'REQUEST_NOT_PENDING',
  BLOCKED: 'BLOCKED',
  SELF_ACTION: 'SELF_ACTION',
  PLAN_IN_PAST: 'PLAN_IN_PAST',
  LIMIT_BELOW_ACCEPTED: 'LIMIT_BELOW_ACCEPTED',
  INVALID_DATES: 'INVALID_DATES',
  NOT_ADDRESSEE: 'NOT_ADDRESSEE',
  NOT_FRIENDS: 'NOT_FRIENDS',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
});

export class DomainError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.expose = true;
  }
}

export const notFound = (what) => new DomainError(ErrorCode.NOT_FOUND, `${what} not found`, 404);
