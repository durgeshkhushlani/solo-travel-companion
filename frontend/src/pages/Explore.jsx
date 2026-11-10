import { useEffect, useState } from 'react';
import { listPlans } from '../api/plans.js';
import { errorMessage } from '../api/errors.js';
import PlanCard from '../components/PlanCard.jsx';
import RecommendedStrip from '../components/RecommendedStrip.jsx';
import FormField, { ErrorText } from '../components/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const PAGE_SIZE = 9;
const EMPTY_FILTERS = { q: '', interest: '', from: '', to: '', openOnly: false };

// Only send filters the User actually filled in.
export function buildParams(filters, page) {
  const params = { page, pageSize: PAGE_SIZE };
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.interest.trim()) {
    params.interest = filters.interest.split(',').map((s) => s.trim()).filter(Boolean).join(',');
  }
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.openOnly) params.openOnly = true;
  return params;
}

export default function Explore() {
  const { user } = useAuth();
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listPlans(buildParams(applied, page))
      .then((result) => !cancelled && (setData(result), setError('')))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [applied, page]);

  const change = (e) => {
    const { name, type, checked, value } = e.target;
    setDraft({ ...draft, [name]: type === 'checkbox' ? checked : value });
  };

  function search(e) {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  }

  const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Explore Feed</h1>
      {user && <RecommendedStrip />}
      <form onSubmit={search} className="mb-6 grid gap-3 rounded-lg bg-white p-4 shadow sm:grid-cols-5">
        <FormField label="Search" id="q" name="q" value={draft.q} onChange={change} />
        <FormField label="Interests" id="interest" name="interest" placeholder="food, trekking" value={draft.interest} onChange={change} />
        <FormField label="From" id="from" name="from" type="date" value={draft.from} onChange={change} />
        <FormField label="To" id="to" name="to" type="date" value={draft.to} onChange={change} />
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="openOnly" checked={draft.openOnly} onChange={change} />
            Open only
          </label>
          <button type="submit" className="rounded bg-teal-700 px-3 py-2 text-white">Search</button>
        </div>
      </form>
      <ErrorText>{error}</ErrorText>
      {data.items.length === 0 && !error && <p className="text-slate-500">No Travel Plans match.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
      </div>
      <nav className="mt-6 flex items-center justify-center gap-4" aria-label="Pagination">
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
        <span>Page {page} of {lastPage}</span>
        <button type="button" disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
      </nav>
    </main>
  );
}
