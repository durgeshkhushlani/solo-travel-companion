// Companion Matching score: a weighted blend of three signals, each already 0..1.
export const SIMILARITY_WEIGHT = 0.5;
export const INTEREST_WEIGHT = 0.3;
export const OVERLAP_WEIGHT = 0.2;

// Cosine can be negative; opposite meaning is no better than unrelated, so clamp at 0.
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

// `sharedInterests` is the jaccard ratio. `overlap` is the dateOverlap ratio, or null when the
// other side has no trip dates to compare: the remaining weights are then rescaled to sum to 1.
export function scoreMatch({ similarity, sharedInterests, overlap = null }) {
  const parts = [
    [SIMILARITY_WEIGHT, clamp01(similarity)],
    [INTEREST_WEIGHT, clamp01(sharedInterests)],
  ];
  if (overlap !== null) parts.push([OVERLAP_WEIGHT, clamp01(overlap)]);
  const totalWeight = parts.reduce((sum, [weight]) => sum + weight, 0);
  return parts.reduce((sum, [weight, value]) => sum + weight * value, 0) / totalWeight;
}

const SIMILAR_PROFILE_FROM = 0.75;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The short Match Reason shown with a Best Match, e.g. "3 shared interests, trips overlap 4 days".
// `sharedInterests` is the list of shared names here; `overlapDays` may be 0 or missing.
export function matchReason({ similarity = 0, sharedInterests = [], overlapDays = 0 }) {
  const reasons = [];
  if (sharedInterests.length > 0) {
    reasons.push(plural(sharedInterests.length, 'shared interest'));
  }
  if (overlapDays > 0) reasons.push(`trips overlap ${plural(overlapDays, 'day')}`);
  if (reasons.length === 0 && similarity >= SIMILAR_PROFILE_FROM)
    reasons.push('similar travel style');
  return reasons.length > 0 ? reasons.join(', ') : 'Worth a look';
}
