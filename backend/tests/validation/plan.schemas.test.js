import { describe, it, expect } from 'vitest';
import {
  createPlanSchema,
  exploreQuerySchema,
  updatePlanSchema,
} from '../../src/validation/plan.schemas.js';

const valid = {
  title: 'Spiti in March',
  destination: 'Spiti',
  startDate: '2027-03-01',
  endDate: '2027-03-07',
};

describe('createPlanSchema', () => {
  it('fills_defaults_for_interests_and_itinerary', () => {
    const parsed = createPlanSchema.parse(valid);

    expect(parsed.interests).toEqual([]);
    expect(parsed.itinerary).toEqual([]);
    expect(parsed.startDate).toBeInstanceOf(Date);
  });

  it('lowercases_and_trims_interests', () => {
    const parsed = createPlanSchema.parse({ ...valid, interests: [' Trekking ', 'FOOD'] });

    expect(parsed.interests).toEqual(['trekking', 'food']);
  });

  it.each([
    ['0 companions', 0, false],
    ['1 companion', 1, true],
    ['50 companions', 50, true],
    ['51 companions', 51, false],
    ['no limit (null)', null, true],
  ])('max_companions_with_%s_is_accepted:_%s', (_label, maxCompanions, accepted) => {
    const result = createPlanSchema.safeParse({ ...valid, maxCompanions });

    expect(result.success).toBe(accepted);
  });

  it('rejects_an_itinerary_whose_days_are_not_numbered_in_order', () => {
    const itinerary = [
      { day: 1, title: 'Arrive', activities: [] },
      { day: 3, title: 'Hike', activities: [] },
    ];

    expect(createPlanSchema.safeParse({ ...valid, itinerary }).success).toBe(false);
  });

  it('rejects_a_title_shorter_than_three_characters', () => {
    expect(createPlanSchema.safeParse({ ...valid, title: 'ab' }).success).toBe(false);
  });
});

describe('updatePlanSchema', () => {
  it('does_not_reset_fields_that_were_not_sent', () => {
    const parsed = updatePlanSchema.parse({ title: 'New title' });

    expect(parsed).toEqual({ title: 'New title' });
  });
});

describe('exploreQuerySchema', () => {
  it('applies_paging_and_filter_defaults_to_an_empty_query', () => {
    const parsed = exploreQuerySchema.parse({});

    expect(parsed).toMatchObject({
      interest: [],
      openOnly: false,
      hideEnded: true,
      page: 1,
      pageSize: 20,
    });
  });

  it('splits_the_interest_list_and_reads_flags_from_text', () => {
    const parsed = exploreQuerySchema.parse({ interest: 'Trek, food,', openOnly: 'true' });

    expect(parsed.interest).toEqual(['trek', 'food']);
    expect(parsed.openOnly).toBe(true);
  });

  it.each([
    ['page 0', { page: '0' }],
    ['page size 51', { pageSize: '51' }],
    ['a flag that is not true or false', { openOnly: 'yes' }],
  ])('rejects_%s', (_label, query) => {
    expect(exploreQuerySchema.safeParse(query).success).toBe(false);
  });
});
