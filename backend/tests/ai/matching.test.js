import { describe, it, expect } from 'vitest';
import {
  cosine,
  dateOverlap,
  jaccard,
  overlapDays,
  sharedInterests,
} from '../../src/ai/matching/similarity.js';
import {
  INTEREST_WEIGHT,
  OVERLAP_WEIGHT,
  SIMILARITY_WEIGHT,
  matchReason,
  scoreMatch,
} from '../../src/ai/matching/score.js';
import { planEmbeddingText, profileEmbeddingText } from '../../src/ai/matching/embeddingText.js';
import { rankPlansForUser, rankUsersForPlan } from '../../src/ai/matching/rank.js';
import { BEFORE_START, at, makePlan } from '../helpers/factories.js';

const range = (start, end) => ({ startDate: at(start), endDate: at(end) });
const makeUser = (overrides = {}) => ({ id: 'user-1', interests: [], ...overrides });

describe('cosine', () => {
  it.each([
    ['identical vectors', [1, 2, 3], [1, 2, 3], 1],
    ['same direction, different length', [1, 0], [5, 0], 1],
    ['orthogonal vectors', [1, 0], [0, 1], 0],
    ['opposite vectors', [1, 2], [-1, -2], -1],
    ['a zero vector on the left', [0, 0], [1, 2], 0],
    ['a zero vector on the right', [1, 2], [0, 0], 0],
    ['two empty vectors', [], [], 0],
  ])('is_%s_->_%d', (_label, a, b, expected) => {
    expect(cosine(a, b)).toBeCloseTo(expected, 10);
  });

  it('rejects_vectors_of_different_length', () => {
    expect(() => cosine([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

describe('jaccard', () => {
  it.each([
    ['both empty', [], [], 0],
    ['one empty', ['food'], [], 0],
    ['no overlap', ['food'], ['hiking'], 0],
    ['identical', ['food', 'hiking'], ['hiking', 'food'], 1],
    ['half shared', ['food', 'hiking'], ['food', 'art'], 1 / 3],
    ['different case and spacing', ['Food '], ['food'], 1],
    ['duplicates inside one list', ['food', 'food'], ['food'], 1],
  ])('is_%s_->_%d', (_label, a, b, expected) => {
    expect(jaccard(a, b)).toBeCloseTo(expected, 10);
  });

  it('lists_shared_interests_in_the_order_of_the_first_list', () => {
    expect(sharedInterests(['Art', 'food', 'hiking'], ['hiking', 'ART'])).toEqual([
      'art',
      'hiking',
    ]);
  });
});

describe('dateOverlap', () => {
  const trip = range('2027-03-01', '2027-03-07');

  it.each([
    ['disjoint trips', range('2027-03-10', '2027-03-15'), 0, 0],
    ['trips touching on one date', range('2027-03-07', '2027-03-10'), 1, 1 / 4],
    ['identical trips', trip, 7, 1],
    ['a trip contained in the other', range('2027-03-03', '2027-03-05'), 3, 1],
    ['a partial overlap', range('2027-03-05', '2027-03-12'), 3, 3 / 7],
  ])('for_%s_shares_%i_days_and_ratio_%d', (_label, other, days, ratio) => {
    expect(overlapDays(trip, other)).toBe(days);
    expect(dateOverlap(trip, other)).toBeCloseTo(ratio, 10);
  });

  it('is_symmetric', () => {
    const other = range('2027-03-05', '2027-03-12');

    expect(dateOverlap(other, trip)).toBe(dateOverlap(trip, other));
  });
});

describe('scoreMatch', () => {
  it('has_weights_that_sum_to_one', () => {
    expect(SIMILARITY_WEIGHT + INTEREST_WEIGHT + OVERLAP_WEIGHT).toBeCloseTo(1, 10);
  });

  it.each([
    ['everything perfect', { similarity: 1, sharedInterests: 1, overlap: 1 }, 1],
    ['everything zero', { similarity: 0, sharedInterests: 0, overlap: 0 }, 0],
    ['only similarity', { similarity: 1, sharedInterests: 0, overlap: 0 }, SIMILARITY_WEIGHT],
    ['only interests', { similarity: 0, sharedInterests: 1, overlap: 0 }, INTEREST_WEIGHT],
    ['only overlap', { similarity: 0, sharedInterests: 0, overlap: 1 }, OVERLAP_WEIGHT],
    ['negative similarity counts as zero', { similarity: -1, sharedInterests: 0, overlap: 0 }, 0],
  ])('scores_%s', (_label, parts, expected) => {
    expect(scoreMatch(parts)).toBeCloseTo(expected, 10);
  });

  it('rescales_the_remaining_weights_when_there_is_nothing_to_overlap', () => {
    expect(scoreMatch({ similarity: 1, sharedInterests: 1, overlap: null })).toBeCloseTo(1, 10);
  });
});

describe('matchReason', () => {
  it.each([
    [
      'shared interests and overlap',
      { sharedInterests: ['a', 'b', 'c'], overlapDays: 4 },
      '3 shared interests, trips overlap 4 days',
    ],
    [
      'singular nouns',
      { sharedInterests: ['a'], overlapDays: 1 },
      '1 shared interest, trips overlap 1 day',
    ],
    ['only interests', { sharedInterests: ['a', 'b'], overlapDays: 0 }, '2 shared interests'],
    ['only overlap', { sharedInterests: [], overlapDays: 2 }, 'trips overlap 2 days'],
    ['a similar profile only', { similarity: 0.9 }, 'similar travel style'],
    ['nothing notable', { similarity: 0.2 }, 'Worth a look'],
  ])('says_%s', (_label, parts, expected) => {
    expect(matchReason(parts)).toBe(expected);
  });
});

describe('embedding text', () => {
  it('describes_a_plan_with_title_destination_interests_and_description', () => {
    const plan = makePlan({
      title: 'Alps hike',
      destination: 'Switzerland',
      interests: ['hiking', 'food'],
      description: 'Easy trails',
    });

    expect(planEmbeddingText(plan)).toBe(
      'Trip: Alps hike\nDestination: Switzerland\nInterests: hiking, food\nAbout: Easy trails',
    );
  });

  it('leaves_out_empty_plan_fields', () => {
    expect(planEmbeddingText(makePlan({ title: 'Alps', interests: [] }))).toBe('Trip: Alps');
  });

  it('describes_a_profile_with_travel_style_interests_and_bio', () => {
    const user = makeUser({ travelStyle: 'backpacker', interests: ['art'], bio: 'Solo for years' });

    expect(profileEmbeddingText(user)).toBe(
      'Travel style: backpacker\nInterests: art\nAbout: Solo for years',
    );
  });

  it('gives_an_empty_text_for_a_blank_profile', () => {
    expect(profileEmbeddingText(makeUser())).toBe('');
  });
});

describe('rankPlansForUser (Recommended for You)', () => {
  const user = makeUser({ id: 'me', interests: ['food'] });
  const rank = (plans, planEmbeddings = new Map(), extra = {}) =>
    rankPlansForUser({
      user,
      userEmbedding: [1, 0],
      plans,
      planEmbeddings,
      now: BEFORE_START,
      ...extra,
    });

  it('orders_plans_from_the_best_score_to_the_worst', () => {
    const plans = [
      makePlan({ id: 'p-far', interests: [] }),
      makePlan({ id: 'p-near', interests: ['food'] }),
    ];
    const embeddings = new Map([
      ['p-far', [0, 1]],
      ['p-near', [1, 0]],
    ]);

    expect(rank(plans, embeddings).map((r) => r.item.id)).toEqual(['p-near', 'p-far']);
  });

  it('keeps_ties_in_id_order_whatever_the_input_order', () => {
    const plans = ['p-c', 'p-a', 'p-b'].map((id) => makePlan({ id }));

    expect(rank(plans).map((r) => r.item.id)).toEqual(['p-a', 'p-b', 'p-c']);
  });

  it('excludes_plans_the_user_hosts', () => {
    const plans = [makePlan({ id: 'mine', hostId: 'me' }), makePlan({ id: 'theirs' })];

    expect(rank(plans).map((r) => r.item.id)).toEqual(['theirs']);
  });

  it.each([
    ['one millisecond before the start date', '2027-02-28T23:59:59.999Z', 1],
    ['exactly at the start date', '2027-03-01T00:00:00.000Z', 0],
  ])('with_now_%s_the_plan_is_listed:_%i', (_label, now, count) => {
    const result = rankPlansForUser({
      user,
      userEmbedding: null,
      plans: [makePlan()],
      planEmbeddings: new Map(),
      now: at(now),
    });

    expect(result).toHaveLength(count);
  });

  it('scores_a_plan_without_an_embedding_on_interests_alone', () => {
    const [entry] = rank([makePlan({ interests: ['food'] })]);

    expect(entry.score).toBeCloseTo(
      (INTEREST_WEIGHT * 1) / (SIMILARITY_WEIGHT + INTEREST_WEIGHT),
      10,
    );
  });

  it('adds_the_match_reason_with_shared_interests_and_trip_overlap', () => {
    const userTrips = [range('2027-03-05', '2027-03-20')];

    const [entry] = rank([makePlan({ interests: ['food', 'art'] })], new Map(), { userTrips });

    expect(entry.reason).toBe('1 shared interest, trips overlap 3 days');
  });

  it('returns_an_empty_list_when_there_are_no_plans', () => {
    expect(rank([])).toEqual([]);
  });
});

describe('rankUsersForPlan (Best Match)', () => {
  const plan = makePlan({ id: 'plan-1', hostId: 'host-1', interests: ['food', 'art'] });
  const rank = (users, userEmbeddings = new Map(), extra = {}) =>
    rankUsersForPlan({ plan, planEmbedding: [1, 0], users, userEmbeddings, ...extra });

  it('orders_users_from_the_best_score_to_the_worst', () => {
    const users = [
      makeUser({ id: 'u-none' }),
      makeUser({ id: 'u-both', interests: ['food', 'art'] }),
      makeUser({ id: 'u-one', interests: ['food'] }),
    ];

    expect(rank(users).map((r) => r.item.id)).toEqual(['u-both', 'u-one', 'u-none']);
  });

  it('keeps_ties_in_id_order_whatever_the_input_order', () => {
    const users = ['u-b', 'u-c', 'u-a'].map((id) => makeUser({ id }));

    expect(rank(users).map((r) => r.item.id)).toEqual(['u-a', 'u-b', 'u-c']);
  });

  it('excludes_the_host', () => {
    const users = [makeUser({ id: 'host-1' }), makeUser({ id: 'u-1' })];

    expect(rank(users).map((r) => r.item.id)).toEqual(['u-1']);
  });

  it('excludes_users_in_the_exclude_set', () => {
    const users = [makeUser({ id: 'u-1' }), makeUser({ id: 'u-2' })];

    const result = rank(users, new Map(), { excludeUserIds: new Set(['u-1']) });

    expect(result.map((r) => r.item.id)).toEqual(['u-2']);
  });

  it('uses_embedding_similarity_to_break_an_interest_tie', () => {
    const users = [makeUser({ id: 'u-a' }), makeUser({ id: 'u-b' })];
    const embeddings = new Map([
      ['u-a', [0, 1]],
      ['u-b', [1, 0]],
    ]);

    expect(rank(users, embeddings).map((r) => r.item.id)).toEqual(['u-b', 'u-a']);
  });

  it('gives_each_best_match_a_reason', () => {
    const [entry] = rank([makeUser({ id: 'u-1', interests: ['art', 'food'] })]);

    expect(entry.reason).toBe('2 shared interests');
  });
});
