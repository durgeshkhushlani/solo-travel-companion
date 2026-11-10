// Rule violations raised by the core. `status` and `expose` let the HTTP error handler
// answer with the right code and message without the core knowing about HTTP.
export const ErrorCode = Object.freeze({
  PLAN_FULL: 'PLAN_FULL',
  PLAN_CLOSED: 'PLAN_CLOSED',
  HOST_CANNOT_JOIN: 'HOST_CANNOT_JOIN',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  BAD_CREDENTIALS: 'BAD_CREDENTIALS',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
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
