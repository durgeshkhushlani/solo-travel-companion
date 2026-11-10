import { DomainError, ErrorCode } from '../domain/errors.js';

// Register and log in Users. Storage and hashing are injected (UserRepository, PasswordHasher).
export function createAuthService({ users, hasher }) {
  const badCredentials = () =>
    new DomainError(ErrorCode.BAD_CREDENTIALS, 'Incorrect email or password', 401);

  return {
    async register({ name, email, password }) {
      if (await users.findByEmail(email)) {
        throw new DomainError(ErrorCode.EMAIL_TAKEN, 'That email is already registered', 409);
      }
      const passwordHash = await hasher.hash(password);
      return users.create({ name, email, passwordHash });
    },

    // Unknown email and wrong password give the same error, so the response never reveals
    // which emails exist. Deactivation is only reported once the password is right.
    async login({ email, password }) {
      const user = await users.findByEmail(email);
      if (!user || !(await hasher.verify(password, user.passwordHash))) throw badCredentials();
      if (!user.active) {
        throw new DomainError(ErrorCode.ACCOUNT_DEACTIVATED, 'This account is deactivated', 403);
      }
      return user;
    },

    // The User behind a Session, or null when the account is gone or deactivated.
    async currentUser(id) {
      const user = await users.findById(id);
      return user?.active ? user : null;
    },
  };
}
