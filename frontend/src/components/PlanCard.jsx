import { Link } from 'react-router-dom';
import { formatDateRange, spotsLeftText, STATUS_LABEL } from '../utils/format.js';

const STATUS_STYLE = {
  OPEN: 'bg-emerald-100 text-emerald-800',
  FULL: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-slate-200 text-slate-700',
};

export default function PlanCard({ plan, reason }) {
  return (
    <article className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">
          <Link to={`/plans/${plan.id}`} className="text-teal-700 hover:underline">{plan.title}</Link>
        </h3>
        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[plan.status]}`}>
          {STATUS_LABEL[plan.status]}
        </span>
      </div>
      <p className="text-sm text-slate-600">{plan.destination}</p>
      <p className="text-sm text-slate-600">{formatDateRange(plan.startDate, plan.endDate)}</p>
      <p className="mt-1 text-sm font-medium">{spotsLeftText(plan)}</p>
      <p className="text-xs text-slate-500">Hosted by {plan.host.name}</p>
      {reason && <p className="mt-1 text-xs italic text-slate-500">{reason}</p>}
    </article>
  );
}
