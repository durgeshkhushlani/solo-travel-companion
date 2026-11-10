import { joinButtonState } from '../utils/planActions.js';

const BUTTON = 'rounded px-4 py-2';

// Renders the one control (or message) that matches joinButtonState.
export default function JoinControls({ plan, user, myRequest, isCompanion, onJoin, onCancel, onLeave }) {
  const state = joinButtonState({ plan, user, myRequest, isCompanion });
  switch (state) {
    case 'JOIN':
      return <button type="button" onClick={onJoin} className={`${BUTTON} bg-teal-700 text-white`}>Join</button>;
    case 'CANCEL':
      return (
        <span className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Request pending</span>
          <button type="button" onClick={onCancel} className={`${BUTTON} border`}>Cancel request</button>
        </span>
      );
    case 'PENDING':
      return <span className="text-sm text-slate-600">Request pending</span>;
    case 'LEAVE':
      return <button type="button" onClick={onLeave} className={`${BUTTON} border border-red-700 text-red-700`}>Leave Trip</button>;
    case 'FULL':
      return <span className="text-sm font-medium text-amber-700">Plan is full</span>;
    case 'CLOSED':
      return <span className="text-sm font-medium text-slate-600">Plan has started</span>;
    default:
      return null; // HOST (own controls are shown elsewhere) and NONE (logged out)
  }
}
