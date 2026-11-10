import { hasStarted } from '../../domain/plan.js';
import { cosine, dateOverlap, jaccard, overlapDays, sharedInterests } from './similarity.js';
import { matchReason, scoreMatch } from './score.js';

// A missing Embedding (not generated yet) scores 0 similarity; Interests and dates still count.
const similarityOf = (a, b) => (a && b ? cosine(a, b) : 0);

// Best overlap between one trip and the other side's trips; null when there is nothing to compare.
function bestOverlap(range, trips = []) {
  if (trips.length === 0) return null;
  return trips
    .map((trip) => ({ ratio: dateOverlap(range, trip), days: overlapDays(range, trip) }))
    .reduce((best, next) => (next.ratio > best.ratio ? next : best));
}

function rankedEntry(item, { similarity, interestsA, interestsB, tripRange, trips }) {
  const shared = sharedInterests(interestsA, interestsB);
  const overlap = bestOverlap(tripRange, trips);
  return {
    item,
    score: scoreMatch({
      similarity,
      sharedInterests: jaccard(interestsA, interestsB),
      overlap: overlap && overlap.ratio,
    }),
    reason: matchReason({
      similarity,
      sharedInterests: shared,
      overlapDays: overlap ? overlap.days : 0,
    }),
  };
}

// High to low; equal scores fall back to id so the order never flickers between requests.
const byScoreThenId = (a, b) => b.score - a.score || (a.item.id < b.item.id ? -1 : 1);

// Recommended for You. `userTrips` (optional) are date ranges the User already has, used for overlap.
export function rankPlansForUser({ user, userEmbedding, plans, planEmbeddings, now, userTrips }) {
  return plans
    .filter((plan) => plan.hostId !== user.id && !hasStarted(plan, now))
    .map((plan) =>
      rankedEntry(plan, {
        similarity: similarityOf(userEmbedding, planEmbeddings.get(plan.id)),
        interestsA: user.interests ?? [],
        interestsB: plan.interests ?? [],
        tripRange: plan,
        trips: userTrips,
      }),
    )
    .sort(byScoreThenId);
}

// Best Match for a Travel Plan. `userTrips` (optional) maps a user id to that User's date ranges.
export function rankUsersForPlan({
  plan,
  planEmbedding,
  users,
  userEmbeddings,
  userTrips = new Map(),
  excludeUserIds = new Set(),
}) {
  return users
    .filter((user) => user.id !== plan.hostId && !excludeUserIds.has(user.id))
    .map((user) =>
      rankedEntry(user, {
        similarity: similarityOf(planEmbedding, userEmbeddings.get(user.id)),
        interestsA: plan.interests ?? [],
        interestsB: user.interests ?? [],
        tripRange: plan,
        trips: userTrips.get(user.id),
      }),
    )
    .sort(byScoreThenId);
}
