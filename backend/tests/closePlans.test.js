import { describe, it, expect, vi } from 'vitest';
import { closeStartedPlans } from '../src/jobs/closePlans.js';
import { at } from './helpers/factories.js';

describe('Auto-Close job', () => {
  it('asks_the_plans_to_close_everything_started_by_the_current_time_and_reports_the_count', async () => {
    const closeStartedBy = vi.fn().mockResolvedValue(3);
    const clock = { now: () => at('2027-03-01T08:00:00.000Z') };

    const closed = await closeStartedPlans({ plans: { closeStartedBy }, clock });

    expect(closed).toBe(3);
    expect(closeStartedBy).toHaveBeenCalledTimes(1);
    expect(closeStartedBy).toHaveBeenCalledWith(at('2027-03-01T08:00:00.000Z'));
  });

  it('reports_zero_when_no_plan_has_started', async () => {
    const plans = { closeStartedBy: async () => 0 };

    const closed = await closeStartedPlans({ plans, clock: { now: () => new Date() } });

    expect(closed).toBe(0);
  });
});
