import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

function renderGuarded({ user, loading = false, role }) {
  return render(
    <AuthContext.Provider value={{ user, loading }}>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/" element={<p>home page</p>} />
          <Route path="/secret" element={<ProtectedRoute role={role}><p>secret content</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  it('shows_a_loading_message_while_the_session_is_being_checked', () => {
    renderGuarded({ user: null, loading: true });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('redirects_a_guest_to_login', () => {
    renderGuarded({ user: null });
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows_the_page_to_a_logged_in_user', () => {
    renderGuarded({ user: { id: 'u1', role: 'USER' } });
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('refuses_a_normal_user_on_an_admin_route', () => {
    renderGuarded({ user: { id: 'u1', role: 'USER' }, role: 'ADMIN' });
    expect(screen.getByText('home page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('lets_an_admin_into_an_admin_route', () => {
    renderGuarded({ user: { id: 'a1', role: 'ADMIN' }, role: 'ADMIN' });
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});
