import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import * as authApi from '../api/auth.js';

vi.mock('../api/auth.js');

function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <p>{loading ? 'loading' : 'ready'}</p>
      <p>{user ? `hello ${user.name}` : 'nobody'}</p>
      <button onClick={() => login({ email: 'a@b.co', password: 'secret123' })}>do-login</button>
      <button onClick={() => logout()}>do-logout</button>
    </div>
  );
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => vi.resetAllMocks());

  it('loads_the_session_from_auth_me_on_start', async () => {
    authApi.me.mockResolvedValue({ user: { id: 'u1', name: 'Alice' } });
    renderProbe();
    expect(await screen.findByText('hello Alice')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('reports_loading_until_the_session_check_finishes', async () => {
    authApi.me.mockReturnValue(new Promise(() => {}));
    renderProbe();
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('leaves_user_empty_when_there_is_no_session', async () => {
    authApi.me.mockRejectedValue({ response: { status: 401 } });
    renderProbe();
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
    expect(screen.getByText('nobody')).toBeInTheDocument();
  });

  it('sets_the_user_after_a_successful_login', async () => {
    authApi.me.mockRejectedValue({});
    authApi.login.mockResolvedValue({ user: { id: 'u2', name: 'Bo' } });
    renderProbe();
    await screen.findByText('nobody');

    await userEvent.click(screen.getByText('do-login'));

    expect(authApi.login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret123' });
    expect(await screen.findByText('hello Bo')).toBeInTheDocument();
  });

  it('clears_the_user_after_logout', async () => {
    authApi.me.mockResolvedValue({ user: { id: 'u1', name: 'Alice' } });
    authApi.logout.mockResolvedValue(undefined);
    renderProbe();
    await screen.findByText('hello Alice');

    await userEvent.click(screen.getByText('do-logout'));

    expect(await screen.findByText('nobody')).toBeInTheDocument();
  });
});
