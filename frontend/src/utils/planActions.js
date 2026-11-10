// What the Join button on a Travel Plan should do for the current User.
// Pure on purpose: the whole decision table is unit-testable without rendering.
//   plan: PlanDto, user: current User or null,
//   myRequest: the User's Join Request for this plan (or null), isCompanion: boolean.
export function joinButtonState({ plan, user, myRequest, isCompanion }) {
  if (!user) return 'NONE';
  if (plan.host.id === user.id) return 'HOST';
  if (isCompanion) return 'LEAVE';
  if (myRequest?.status === 'PENDING') return 'CANCEL';
  if (plan.status === 'CLOSED') return 'CLOSED';
  if (plan.status === 'FULL') return 'FULL';
  return 'JOIN';
}
