import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as adminApi from '../../api/admin.js';
import { errorMessage } from '../../api/errors.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorText } from '../../components/FormField.jsx';

const STAT_LABELS = { users: 'Users', plans: 'Travel Plans', requests: 'Join Requests', messages: 'Messages' };

export default function AdminDashboard() {
  const { user: me } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, u, p] = await Promise.all([adminApi.getStats(), adminApi.listUsers(), adminApi.listAdminPlans()]);
      setStats(s);
      setUsers(u.items);
      setPlans(p.items);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = (fn) => async () => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Admin Panel</h1>
      <ErrorText>{error}</ErrorText>

      <section aria-label="Platform Stats">
        <h2 className="mb-2 text-lg font-semibold">Platform Stats</h2>
        {stats && (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(STAT_LABELS).map(([key, label]) => (
              <div key={key} className="rounded bg-white p-3 shadow">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="text-xl font-semibold">{stats[key]}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Users</h2>
        <ul className="divide-y rounded bg-white shadow">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 p-3">
              <span>
                <Link to={`/profile/${u.id}`} className="text-teal-700 hover:underline">{u.name}</Link>
                <span className="ml-2 text-xs text-slate-500">{u.role}{u.active ? '' : ' - deactivated'}</span>
              </span>
              <button
                type="button"
                disabled={u.id === me?.id}
                onClick={act(() => adminApi.setUserActive(u.id, !u.active))}
                aria-label={`${u.active ? 'Deactivate' : 'Reactivate'} ${u.name}`}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                {u.active ? 'Deactivate' : 'Reactivate'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Travel Plans</h2>
        <ul className="divide-y rounded bg-white shadow">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 p-3">
              <Link to={`/plans/${p.id}`} className="text-teal-700 hover:underline">{p.title}</Link>
              <button
                type="button"
                aria-label={`Delete ${p.title}`}
                onClick={act(() => adminApi.deleteAdminPlan(p.id))}
                className="rounded border border-red-700 px-3 py-1 text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
