import { describe, it, expect } from 'vitest';
import { assertCanChangeActive } from '../src/domain/admin.js';
import { createAdminService } from '../src/services/admin.service.js';
import { ErrorCode } from '../src/domain/errors.js';
import { createWorld } from './helpers/world.js';

function setup() {
  const world = createWorld();
  const admin = world.addUser({ id: 'admin-1', name: 'Root', role: 'ADMIN' });
  const asha = world.addUser({ id: 'asha-1', name: 'Asha' });
  world.addUser({ id: 'host-1', name: 'Ravi' });
  const service = createAdminService({ repos: world.repos, clock: world.clock });
  return { world, admin, asha, service };
}

describe('assertCanChangeActive', () => {
  it.each([
    ['deactivating yourself', 'a1', 'a1', false, true],
    ['reactivating yourself', 'a1', 'a1', true, false],
    ['deactivating someone else', 'a1', 'u2', false, false],
  ])('refuses_%s:_%s', (_label, actor, target, active, refused) => {
    const run = () => assertCanChangeActive(actor, target, active);

    if (refused) {
      expect(run).toThrowError(expect.objectContaining({ code: ErrorCode.SELF_ACTION }));
    } else {
      expect(run).not.toThrow();
    }
  });
});

describe('Admin service', () => {
  it('counts_users_plans_requests_and_messages_for_platform_stats', async () => {
    const { world, service } = setup();
    world.addPlan();

    expect(await service.stats()).toEqual({ users: 3, plans: 1, requests: 0, messages: 0 });
  });

  it('lists_every_user_with_email_and_active_flag_for_the_admin', async () => {
    const { admin, service } = setup();

    const users = await service.users(admin);

    expect(users).toHaveLength(3);
    expect(users[1]).toMatchObject({ name: 'Asha', email: 'asha-1@example.com', active: true });
    expect(JSON.stringify(users)).not.toContain('passwordHash');
  });

  it('deactivates_and_reactivates_a_user_without_deleting_them', async () => {
    const { world, admin, asha, service } = setup();

    const off = await service.setActive(admin, asha.id, false);
    const on = await service.setActive(admin, asha.id, true);

    expect(off.active).toBe(false);
    expect(on.active).toBe(true);
    expect(world.db.users).toHaveLength(3);
  });

  it('refuses_an_admin_deactivating_their_own_account', async () => {
    const { admin, service } = setup();

    await expect(service.setActive(admin, admin.id, false)).rejects.toMatchObject({
      code: ErrorCode.SELF_ACTION,
    });
  });

  it('answers_not_found_for_an_unknown_user', async () => {
    const { admin, service } = setup();

    await expect(service.setActive(admin, 'missing', false)).rejects.toMatchObject({ status: 404 });
  });

  it('removes_a_plan_for_moderation_and_reports_unknown_plans', async () => {
    const { world, service } = setup();
    const plan = world.addPlan();

    await service.removePlan(plan.id);

    expect(world.db.plans).toHaveLength(0);
    await expect(service.removePlan(plan.id)).rejects.toMatchObject({ status: 404 });
  });

  it('lists_all_plans_including_ended_ones', async () => {
    const { world, service } = setup();
    world.addPlan();
    world.addPlan();

    expect(await service.plans()).toHaveLength(2);
  });
});
