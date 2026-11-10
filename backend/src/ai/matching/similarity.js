const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Cosine similarity of two Embeddings, -1..1. A zero vector has no direction, so it is 0
// (not NaN); vectors of different length mean two different models and are a bug, so we throw.
export function cosine(a, b) {
  if (a.length !== b.length) throw new RangeError('Embeddings must have the same length');
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const normalise = (interest) => interest.trim().toLowerCase();

// Interests the two lists have in common, case-insensitive, in the order of `a`.
export function sharedInterests(a, b) {
  const inB = new Set(b.map(normalise));
  return [...new Set(a.map(normalise))].filter((interest) => inB.has(interest));
}

// Share of all distinct Interests that both sides have, 0..1. Two empty lists share nothing: 0.
export function jaccard(a, b) {
  const union = new Set([...a, ...b].map(normalise));
  if (union.size === 0) return 0;
  return sharedInterests(a, b).length / union.size;
}

const dayCount = (range) =>
  Math.floor((range.endDate.getTime() - range.startDate.getTime()) / MS_PER_DAY) + 1;

// Days both trips cover, counting both end days (Travel Plans run from day to day inclusive),
// so two trips that touch on one date overlap by 1 day.
export function overlapDays(rangeA, rangeB) {
  const start = Math.max(rangeA.startDate.getTime(), rangeB.startDate.getTime());
  const end = Math.min(rangeA.endDate.getTime(), rangeB.endDate.getTime());
  return end < start ? 0 : Math.floor((end - start) / MS_PER_DAY) + 1;
}

// Overlap as a share of the shorter trip, 0..1: a short trip inside a long one is a full match.
export function dateOverlap(rangeA, rangeB) {
  return overlapDays(rangeA, rangeB) / Math.min(dayCount(rangeA), dayCount(rangeB));
}
