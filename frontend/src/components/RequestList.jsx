import { Link } from 'react-router-dom';

// The Host's view of Join Requests; only PENDING ones can be decided.
export default function RequestList({ requests, onAccept, onReject }) {
  if (requests.length === 0) return <p className="text-sm text-slate-500">No Join Requests yet.</p>;
  return (
    <ul className="divide-y rounded bg-white shadow">
      {requests.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 p-3">
          <span>
            <Link to={`/profile/${r.user.id}`} className="text-teal-700 hover:underline">{r.user.name}</Link>
            <span className="ml-2 text-xs text-slate-500">{r.status}</span>
          </span>
          {r.status === 'PENDING' && (
            <span className="flex gap-2">
              <button type="button" onClick={() => onAccept(r.id)} className="rounded bg-teal-700 px-3 py-1 text-white" aria-label={`Accept ${r.user.name}`}>Accept</button>
              <button type="button" onClick={() => onReject(r.id)} className="rounded border px-3 py-1" aria-label={`Reject ${r.user.name}`}>Reject</button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
