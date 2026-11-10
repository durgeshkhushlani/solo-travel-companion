import { describe, it, expect } from 'vitest';
import { createAuthService } from '../src/services/auth.service.js';
import { ErrorCode } from '../src/domain/errors.js';
import { createFakeUsers, fakeHasher } from './helpers/fakes.js';

const asha = { name: 'Asha Rao', email: 'asha@example.com', password: 'longenough1' };

async function serviceWithAsha(overrides = {}) {
  const users = createFakeUsers();
  const auth = createAuthService({ users, hasher: fakeHasher });
  const registered = await auth.register(asha);
  Object.assign(registered, overrides);
  return { auth, users, registered };
}

describe('register', () => {
  it('stores_a_hash_and_never_the_password', async () => {
    const users = createFakeUsers();
    const auth = createAuthService({ users, hasher: fakeHasher });

    await auth.register(asha);

    expect(users.rows[0].passwordHash).toBe(await fakeHasher.hash(asha.password));
    expect(JSON.stringify(users.rows[0])).not.toContain(asha.password);
  });

  it('refuses_an_email_that_is_already_registered', async () => {
    const { auth } = await serviceWithAsha();

    await expect(auth.register(asha)).rejects.toMatchObject({
      code: ErrorCode.EMAIL_TAKEN,
      status: 409,
    });
  });
});

describe('login', () => {
  it('returns_the_user_when_the_password_is_right', async () => {
    const { auth, registered } = await serviceWithAsha();

    const user = await auth.login({ email: asha.email, password: asha.password });

    expect(user.id).toBe(registered.id);
  });

  it('gives_the_same_error_for_a_wrong_password_and_an_unknown_email', async () => {
    const { auth } = await serviceWithAsha();

    const wrongPassword = await auth
      .login({ email: asha.email, password: 'not-the-password' })
      .catch((e) => e);
    const unknownEmail = await auth
      .login({ email: 'nobody@example.com', password: asha.password })
      .catch((e) => e);

    expect(wrongPassword).toMatchObject({ code: ErrorCode.BAD_CREDENTIALS, status: 401 });
    expect(unknownEmail.code).toBe(wrongPassword.code);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });

  it('refuses_a_deactivated_account_once_the_password_is_right', async () => {
    const { auth } = await serviceWithAsha({ active: false });

    await expect(auth.login({ email: asha.email, password: asha.password })).rejects.toMatchObject({
      code: ErrorCode.ACCOUNT_DEACTIVATED,
      status: 403,
    });
  });

  it('does_not_reveal_deactivation_to_someone_with_the_wrong_password', async () => {
    const { auth } = await serviceWithAsha({ active: false });

    await expect(auth.login({ email: asha.email, password: 'guess' })).rejects.toMatchObject({
      code: ErrorCode.BAD_CREDENTIALS,
    });
  });
});
