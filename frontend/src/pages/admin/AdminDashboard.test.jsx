import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminDashboard from './AdminDashboard.jsx';
import ProtectedRoute from '../../components/ProtectedRoute.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import * as adminApi from '../../api/admin.js';
import { admin, alice } from '../../test/render.jsx';
import { makePlan } from '../../test/fixtures.js';

vi.mock('../../api/admin.js');

// Mounts the dashboard behind the same guard App.jsx uses for /admin.
function renderAdminRoute(user) {
  return render(
    <AuthContext.Provider value={{ user, loading: false }}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<p>home page</p>} />
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    adminApi.getStats.mockResolvedValue({ users: 12, plans: 5, requests: 9, messages: 40 });
    adminApi.listUsers.mockResolvedValue({
      items: [
        { id: 'a1', name: 'Root', role: 'ADMIN', active: true },
        { id: 'u2', name: 'Bo', role: 'USER', active: true },
        { id: 'u3', name: 'Cy', role: 'USER', active: false },
      ],
    });
    adminApi.listAdminPlans.mockResolvedValue({ items: [makePlan({ id: 'p1', title: 'Hampi Trek' })] });
  });

  it('does_not_show_the_admin_panel_or_call_the_api_for_a_normal_user', () => {
    renderAdminRoute(alice);
    expect(screen.getByText('home page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    expect(adminApi.getStats).not.toHaveBeenCalled();
  });

  it('shows_platform_stats_to_an_admin', async () => {
    renderAdminRoute(admin);
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('Join Requests')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('deactivates_an_active_user', async () => {
    adminApi.setUserActive.mockResolvedValue({});
    renderAdminRoute(admin);

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Bo' }));

    expect(adminApi.setUserActive).toHaveBeenCalledWith('u2', false);
  });

  it('reactivates_a_deactivated_user', async () => {
    adminApi.setUserActive.mockResolvedValue({});
    renderAdminRoute(admin);

    await userEvent.click(await screen.findByRole('button', { name: 'Reactivate Cy' }));

    expect(adminApi.setUserActive).toHaveBeenCalledWith('u3', true);
  });

  it('stops_an_admin_from_deactivating_themselves', async () => {
    renderAdminRoute(admin);
    expect(await screen.findByRole('button', { name: 'Deactivate Root' })).toBeDisabled();
  });

  it('deletes_a_travel_plan_for_moderation', async () => {
    adminApi.deleteAdminPlan.mockResolvedValue(undefined);
    renderAdminRoute(admin);

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Hampi Trek' }));

    expect(adminApi.deleteAdminPlan).toHaveBeenCalledWith('p1');
  });

  it('shows_the_server_error_when_a_toggle_fails', async () => {
    adminApi.setUserActive.mockRejectedValue({ response: { data: { error: 'Cannot deactivate the last Admin' } } });
    renderAdminRoute(admin);

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Bo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('last Admin');
  });
});
