import { PlanStatus } from '../../src/domain/enums.js';

export const at = (iso) => new Date(iso);

// A Travel Plan starting 1 March 2027 with room for 2 Companions, open for requests.
export function makePlan(overrides = {}) {
  return {
    id: 'plan-1',
    hostId: 'host-1',
    status: PlanStatus.OPEN,
    startDate: at('2027-03-01T00:00:00.000Z'),
    endDate: at('2027-03-07T00:00:00.000Z'),
    maxCompanions: 2,
    ...overrides,
  };
}

export const BEFORE_START = at('2027-02-20T10:00:00.000Z');
