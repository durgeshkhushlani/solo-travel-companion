import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as plansApi from '../../api/plans.js';
import * as requestsApi from '../../api/requests.js';
import { getPlanMatches } from '../../api/ai.js';
import { errorMessage } from '../../api/errors.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateRange, spotsLeftText, STATUS_LABEL } from '../../utils/format.js';
import JoinControls from '../../components/JoinControls.jsx';
import RequestList from '../../components/RequestList.jsx';
import { ErrorText } from '../../components/FormField.jsx';

// The Join Request that matters for the button: a pending one wins, else the latest.
const pickMyRequest = (items, planId) => {
  const mine = items.filter((r) => r.plan.id === planId);
  return mine.find((r) => r.status === 'PENDING') ?? mine.at(-1) ?? null;
};

export default function PlanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [companions, setCompanions] = useState([]);
  const [myRequest, setMyRequest] = useState(null);
  const [requests, setRequests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');

  const isHost = Boolean(user && plan && plan.host.id === user.id);

  const load = useCallback(async () => {
    try {
      const { plan: p } = await plansApi.getPlan(id);
      setPlan(p);
      setCompanions((await plansApi.listCompanions(id)).items);
      if (!user) return;
      if (p.host.id === user.id) {
        setRequests((await requestsApi.listPlanRequests(id)).items);
        // Best matches come from the optional AI layer: hide the panel on any error.
        getPlanMatches(id).then((d) => setMatches(d.items)).catch(() => setMatches([]));
      } else {
        setMyRequest(pickMyRequest((await requestsApi.listMyRequests()).items, id));
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Run a mutation, then refresh everything so the buttons reflect the server's state.
  const act = (fn) => async () => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  async function remove() {
    try {
      await plansApi.deletePlan(id);
      navigate('/explore');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!plan) return error ? <ErrorText>{error}</ErrorText> : <p className="p-6">Loading...</p>;

  const isCompanion = companions.some((c) => c.id === user?.id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <ErrorText>{error}</ErrorText>
      <header>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{plan.title}</h1>
          <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">{STATUS_LABEL[plan.status]}</span>
        </div>
        <p className="text-slate-600">{plan.destination} - {formatDateRange(plan.startDate, plan.endDate)}</p>
        <p className="text-sm">{spotsLeftText(plan)} - Hosted by <Link to={`/profile/${plan.host.id}`} className="text-teal-700 hover:underline">{plan.host.name}</Link></p>
        {plan.description && <p className="mt-2">{plan.description}</p>}
      </header>

      <JoinControls
        plan={plan} user={user} myRequest={myRequest} isCompanion={isCompanion}
        onJoin={act(() => requestsApi.sendJoinRequest(id))}
        onCancel={act(() => requestsApi.cancelRequest(myRequest.id))}
        onLeave={act(() => plansApi.leaveTrip(id))}
      />

      <section>
        <h2 className="mb-2 text-lg font-semibold">Itinerary</h2>
        {plan.itinerary.length === 0 && <p className="text-sm text-slate-500">No Itinerary yet.</p>}
        <ol className="space-y-2">
          {plan.itinerary.map((d) => (
            <li key={d.day} className="rounded bg-white p-3 shadow">
              <h3 className="font-medium">Day {d.day}: {d.title}</h3>
              <ul className="list-inside list-disc text-sm">{d.activities.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Companions</h2>
        {companions.length === 0 && <p className="text-sm text-slate-500">No Companions yet.</p>}
        <ul className="space-y-1">
          {companions.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <Link to={`/profile/${c.id}`} className="text-teal-700 hover:underline">{c.name}</Link>
              {isHost && (
                <button type="button" aria-label={`Remove ${c.name}`} onClick={act(() => plansApi.removeCompanion(id, c.id))} className="text-sm text-red-700">Remove</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isHost && (
        <>
          <section>
            <h2 className="mb-2 text-lg font-semibold">Join Requests</h2>
            <RequestList
              requests={requests}
              onAccept={(rid) => act(() => requestsApi.acceptRequest(rid))()}
              onReject={(rid) => act(() => requestsApi.rejectRequest(rid))()}
            />
          </section>
          {matches.length > 0 && (
            <section aria-label="Best matches">
              <h2 className="mb-2 text-lg font-semibold">Best matches</h2>
              <ul className="space-y-1 text-sm">
                {matches.map((m) => (
                  <li key={m.user.id}><Link to={`/profile/${m.user.id}`} className="text-teal-700 hover:underline">{m.user.name}</Link> - {m.reason}</li>
                ))}
              </ul>
            </section>
          )}
          <div className="flex gap-3">
            <Link to={`/plans/${id}/edit`} className="rounded border px-4 py-2">Edit</Link>
            <button type="button" onClick={remove} className="rounded border border-red-700 px-4 py-2 text-red-700">Delete</button>
          </div>
        </>
      )}
    </main>
  );
}
