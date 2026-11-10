import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '../../src/validation/auth.schemas.js';

const valid = { name: 'Asha Rao', email: 'asha@example.com', password: 'longenough1' };

describe('registerSchema', () => {
  it('trims_the_name_and_lowercases_the_email', () => {
    const parsed = registerSchema.parse({
      ...valid,
      name: '  Asha Rao ',
      email: ' Asha@Example.COM ',
    });

    expect(parsed.name).toBe('Asha Rao');
    expect(parsed.email).toBe('asha@example.com');
  });

  it('drops_fields_it_does_not_know_so_a_user_cannot_choose_their_own_role', () => {
    const parsed = registerSchema.parse({ ...valid, role: 'ADMIN', active: false });

    expect(parsed).toEqual(valid);
  });

  it.each([
    ['7 characters', 'a'.repeat(7), false],
    ['8 characters', 'a'.repeat(8), true],
    ['72 characters', 'a'.repeat(72), true],
    ['73 characters', 'a'.repeat(73), false],
  ])('password_of_%s_is_accepted:_%s', (_label, pw, accepted) => {
    const result = registerSchema.safeParse({ ...valid, password: pw });

    expect(result.success).toBe(accepted);
  });

  it.each([
    ['no at sign', 'asha.example.com'],
    ['no domain', 'asha@'],
    ['empty', ''],
  ])('rejects_an_email_with_%s', (_label, bad) => {
    expect(registerSchema.safeParse({ ...valid, email: bad }).success).toBe(false);
  });

  it('rejects_a_one_letter_name', () => {
    expect(registerSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
  });

  it('rejects_input_that_is_not_text', () => {
    expect(registerSchema.safeParse({ ...valid, password: 12345678 }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('does_not_enforce_the_registration_password_length_so_old_accounts_can_still_log_in', () => {
    const result = loginSchema.safeParse({ email: 'asha@example.com', password: 'short' });

    expect(result.success).toBe(true);
  });

  it('rejects_an_empty_password', () => {
    const result = loginSchema.safeParse({ email: 'asha@example.com', password: '' });

    expect(result.success).toBe(false);
  });
});
