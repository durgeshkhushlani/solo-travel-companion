const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Dates arrive as ISO strings; read the calendar parts directly to avoid timezone shifts.
function parts(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

export function formatDate(iso) {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateRange(startIso, endIso) {
  const a = parts(startIso);
  const b = parts(endIso);
  if (a.y === b.y && a.m === b.m && a.d === b.d) return formatDate(startIso);
  if (a.y === b.y && a.m === b.m) return `${a.d}-${b.d} ${MONTHS[a.m - 1]} ${a.y}`;
  return `${formatDate(startIso)} - ${formatDate(endIso)}`;
}

// "2/3 joined" when the Travel Plan has Max Companions, otherwise "Open".
export function spotsLeftText(plan) {
  if (plan.maxCompanions === null || plan.maxCompanions === undefined) return 'Open';
  return `${plan.acceptedCount}/${plan.maxCompanions} joined`;
}

export const STATUS_LABEL = { OPEN: 'Open', FULL: 'Full', CLOSED: 'Closed' };

// "YYYY-MM-DD" from an ISO timestamp, for <input type="date"> values.
export const toDateInput = (iso) => (iso ? String(iso).slice(0, 10) : '');
