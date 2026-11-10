import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import Register, { validateRegistration } from './Register.jsx';

const good = { name: 'Alice', email: 'alice@example.com', password: 'longenough' };

describe('validateRegistration', () => {
  it.each([
    ['password_of_7_chars', { ...good, password: 'a'.repeat(7) }, /8-72/],
    ['password_of_73_chars', { ...good, password: 'a'.repeat(73) }, /8-72/],
    ['blank_name', { ...good, name: '   ' }, /name/i],
    ['email_without_at', { ...good, email: 'alice.example.com' }, /email/i],
  ])('refuses_%s', (_label, input, expected) => {
    expect(validateRegistration(input)).toMatch(expected);
  });

  it.each([
    ['password_of_8_chars', { ...good, password: 'a'.repeat(8) }],
    ['password_of_72_chars', { ...good, password: 'a'.repeat(72) }],
  ])('accepts_%s', (_label, input) => {
    expect(validateRegistration(input)).toBe('');
  });
});

describe('Register page', () => {
  function renderPage(register) {
    return render(
      <AuthContext.Provider value={{ register }}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  }

  it('does_not_call_the_api_when_the_password_is_too_short', async () => {
    const register = vi.fn();
    renderPage(register);
    await userEvent.type(screen.getByLabelText('Name'), 'Alice');
    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'short');

    await userEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(register).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('8-72');
  });

  it('shows_the_server_error_when_the_email_is_already_used', async () => {
    const register = vi.fn().mockRejectedValue({ response: { data: { error: 'Email already registered' } } });
    renderPage(register);
    await userEvent.type(screen.getByLabelText('Name'), 'Alice');
    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'longenough');

    await userEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already registered');
    expect(register).toHaveBeenCalledWith(good);
  });
});
