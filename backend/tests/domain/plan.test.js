import { describe, it, expect } from 'vitest';
import {
  assertAcceptingRequests,
  hasStarted,
  spotsLeft,
  statusAfterAccepting,
  statusFor,
} from '../../src/domain/plan.js';
import { PlanStatus } from '../../src/domain/enums.js';
import { ErrorCode } from '../../src/domain/errors.js';
import { BEFORE_START, at, makePlan } from '../helpers/factories.js';

describe('Auto-Close (rule 3): hasStarted', () => {
  const plan = makePlan({ startDate: at('2027-03-01T00:00:00.000Z') });

  it.each([
    ['one millisecond before the start date', '2027-02-28T23:59:59.999Z', false],
    ['exactly the start date', '2027-03-01T00:00:00.000Z', true],
    ['one millisecond after the start date', '2027-03-01T00:00:00.001Z', true],
    ['a week after the start date', '2027-03-08T00:00:00.000Z', true],
  ])('is_%s_started:_%s', (_label, now, expected) => {
    expect(hasStarted(plan, at(now))).toBe(expected);
  });
});

describe('spotsLeft', () => {
  it.each([
    [2, 0, 2],
    [2, 1, 1],
    [2, 2, 0],
    [2, 3, 0],
    [null, 50, null],
  ])('with_max_%s_and_%s_accepted_there_are_%s_spots_left', (max, accepted, expected) => {
    expect(spotsLeft(makePlan({ maxCompanions: max }), accepted)).toBe(expected);
  });
});

describe('statusFor', () => {
  it.each([
    [2, 0, PlanStatus.OPEN],
    [2, 1, PlanStatus.OPEN],
    [2, 2, PlanStatus.FULL],
    [2, 3, PlanStatus.FULL],
    [null, 100, PlanStatus.OPEN],
  ])('with_max_%s_and_%s_accepted_the_plan_is_%s', (max, accepted, expected) => {
    const plan = makePlan({ maxCompanions: max });

    expect(statusFor(plan, accepted, BEFORE_START)).toBe(expected);
  });

  it('is_closed_once_the_start_date_has_passed_even_with_spots_left', () => {
    const plan = makePlan();

    expect(statusFor(plan, 0, at('2027-03-01T00:00:00.000Z'))).toBe(PlanStatus.CLOSED);
  });

  it('stays_closed_when_the_host_closed_it_before_the_trip', () => {
    const plan = makePlan({ status: PlanStatus.CLOSED });

    expect(statusFor(plan, 0, BEFORE_START)).toBe(PlanStatus.CLOSED);
  });

  it('reopens_a_full_plan_when_a_companion_leaves', () => {
    const plan = makePlan({ status: PlanStatus.FULL });

    expect(statusFor(plan, 1, BEFORE_START)).toBe(PlanStatus.OPEN);
  });
});

describe('Companion limit (rule 1)', () => {
  it('sets_the_plan_to_full_when_the_last_spot_is_taken', () => {
    const plan = makePlan({ maxCompanions: 2 });

    expect(statusAfterAccepting(plan, 1, BEFORE_START)).toBe(PlanStatus.FULL);
  });

  it('keeps_the_plan_open_while_spots_remain', () => {
    const plan = makePlan({ maxCompanions: 3 });

    expect(statusAfterAccepting(plan, 1, BEFORE_START)).toBe(PlanStatus.OPEN);
  });

  it('never_fills_a_plan_without_a_limit', () => {
    const plan = makePlan({ maxCompanions: null });

    expect(statusAfterAccepting(plan, 500, BEFORE_START)).toBe(PlanStatus.OPEN);
  });

  it('refuses_a_companion_when_the_plan_is_already_at_its_limit', () => {
    const plan = makePlan({ maxCompanions: 2 });

    expect(() => statusAfterAccepting(plan, 2, BEFORE_START)).toThrowError(
      expect.objectContaining({ code: ErrorCode.PLAN_FULL, status: 409 }),
    );
  });

  it('refuses_a_companion_when_the_plan_is_closed', () => {
    const plan = makePlan();

    expect(() => assertAcceptingRequests(plan, 0, at('2027-03-02T00:00:00.000Z'))).toThrowError(
      expect.objectContaining({ code: ErrorCode.PLAN_CLOSED, status: 409 }),
    );
  });

  it('reports_closed_rather_than_full_when_the_plan_is_both', () => {
    const plan = makePlan({ maxCompanions: 1 });

    expect(() => assertAcceptingRequests(plan, 1, at('2027-03-02T00:00:00.000Z'))).toThrowError(
      expect.objectContaining({ code: ErrorCode.PLAN_CLOSED }),
    );
  });
});
