import { describe, it, expect } from 'vitest';
import { createPlanService } from '../src/services/plan.service.js';
import { PlanStatus } from '../src/domain/enums.js';
import { ErrorCode } from '../src/domain/errors.js';
import { createWorld } from './helpers/world.js';
import { at } from './helpers/factories.js';

function setup() {
  const world = createWorld();
  const host = world.addUser({ id: 'host-1' });
  const asha = world.addUser({ id: 'asha-1' });
  const service = createPlanService({ repos: world.repos, uow: world.uow, clock: world.clock });
  return { world, host, asha, service };
}

const newPlan = {
  title: 'Ladakh road trip',
  destination: 'Leh',
  startDate: at('2027-06-01T00:00:00.000Z'),
  endDate: at('2027-06-10T00:00:00.000Z'),
  interests: ['biking'],
  maxCompanions: 3,
  itinerary: [],
};

describe('create', () => {
  it('publishes_an_open_plan_hosted_by_the_caller', async () => {
    const { service } = setup();

    const plan = await service.create('host-1', newPlan);

    expect(plan).toMatchObject({ status: PlanStatus.OPEN, spotsLeft: 3, acceptedCount: 0 });
    expect(plan.host.id).toBe('host-1');
  });

  it('refuses_an_end_date_before_the_start_date', async () => {
    const { service } = setup();
    const input = { ...newPlan, endDate: at('2027-05-31T00:00:00.000Z') };

    await expect(service.create('host-1', input)).rejects.toMatchObject({
      code: ErrorCode.INVALID_DATES,
    });
  });

  it('refuses_a_start_date_that_has_already_been_reached', async () => {
    const { service } = setup();
    const input = { ...newPlan, startDate: at('2027-02-20T10:00:00.000Z') };

    await expect(service.create('host-1', input)).rejects.toMatchObject({
      code: ErrorCode.PLAN_IN_PAST,
    });
  });
});

describe('get', () => {
  it('reads_closed_as_soon_as_the_trip_starts_even_before_the_hourly_job_runs', async () => {
    const { world, service } = setup();
    const stored = world.addPlan({ status: PlanStatus.OPEN });
    world.now = at('2027-03-01T00:00:00.000Z');

    const plan = await service.get(stored.id);

    expect(plan.status).toBe(PlanStatus.CLOSED);
  });

  it('reads_full_when_companions_reach_the_limit', async () => {
    const { world, service } = setup();
    const stored = world.addPlan({ maxCompanions: 1 });
    world.addCompanion(stored.id, 'asha-1');

    const plan = await service.get(stored.id);

    expect(plan).toMatchObject({ status: PlanStatus.FULL, spotsLeft: 0, acceptedCount: 1 });
  });

  it('answers_not_found_for_an_unknown_plan', async () => {
    const { service } = setup();

    await expect(service.get('missing')).rejects.toMatchObject({ status: 404 });
  });
});

describe('update', () => {
  it('lets_the_host_change_the_title', async () => {
    const { world, service } = setup();
    const stored = world.addPlan();

    const plan = await service.update('host-1', stored.id, { title: 'Spiti in April' });

    expect(plan.title).toBe('Spiti in April');
  });

  it('refuses_anyone_but_the_host', async () => {
    const { world, service } = setup();
    const stored = world.addPlan();

    await expect(service.update('asha-1', stored.id, { title: 'Hijack' })).rejects.toMatchObject({
      code: ErrorCode.NOT_HOST,
    });
  });

  it('refuses_a_limit_below_the_companions_already_accepted', async () => {
    const { world, service } = setup();
    const stored = world.addPlan({ maxCompanions: 3 });
    world.addCompanion(stored.id, 'asha-1');
    world.addCompanion(stored.id, 'ben-1');

    await expect(service.update('host-1', stored.id, { maxCompanions: 1 })).rejects.toMatchObject({
      code: ErrorCode.LIMIT_BELOW_ACCEPTED,
    });
  });

  it('marks_the_plan_full_when_the_limit_is_lowered_to_the_accepted_count', async () => {
    const { world, service } = setup();
    const stored = world.addPlan({ maxCompanions: 3 });
    world.addCompanion(stored.id, 'asha-1');

    const plan = await service.update('host-1', stored.id, { maxCompanions: 1 });

    expect(plan.status).toBe(PlanStatus.FULL);
  });

  it('reopens_a_full_plan_when_the_limit_is_raised', async () => {
    const { world, service } = setup();
    const stored = world.addPlan({ maxCompanions: 1, status: PlanStatus.FULL });
    world.addCompanion(stored.id, 'asha-1');

    const plan = await service.update('host-1', stored.id, { maxCompanions: 2 });

    expect(plan.status).toBe(PlanStatus.OPEN);
  });

  it('refuses_moving_the_end_date_before_the_stored_start_date', async () => {
    const { world, service } = setup();
    const stored = world.addPlan();

    await expect(
      service.update('host-1', stored.id, { endDate: at('2027-02-27T00:00:00.000Z') }),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_DATES });
  });
});

describe('remove', () => {
  it('deletes_the_plan_for_its_host', async () => {
    const { world, service } = setup();
    const stored = world.addPlan();

    await service.remove('host-1', stored.id);

    expect(world.db.plans).toHaveLength(0);
  });

  it('keeps_the_plan_when_someone_else_tries_to_delete_it', async () => {
    const { world, service } = setup();
    const stored = world.addPlan();

    await expect(service.remove('asha-1', stored.id)).rejects.toMatchObject({ status: 403 });
    expect(world.db.plans).toHaveLength(1);
  });
});

describe('explore', () => {
  it('returns_one_page_with_the_total_and_derived_statuses', async () => {
    const { world, service } = setup();
    world.addPlan();
    world.addPlan();

    const page = await service.explore({ page: 1, pageSize: 1 });

    expect(page).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(page.items).toHaveLength(1);
  });
});
