import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

export const alice = { id: 'u1', name: 'Alice', role: 'USER', interests: [] };
export const admin = { id: 'a1', name: 'Root', role: 'ADMIN', interests: [] };

// Renders `ui` at `path` with a fake logged-in User (or none), without touching the network.
export function renderAt(ui, { path = '/', route = path, user = alice } = {}) {
  const auth = { user, loading: false, login: () => {}, register: () => {}, logout: () => {} };
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
