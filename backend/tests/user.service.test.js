import { describe, it, expect } from 'vitest';
import { createUserService } from '../src/services/user.service.js';
import { createWorld } from './helpers/world.js';

function setup() {
  const world = createWorld();
  const asha = world.addUser({ id: 'asha-1', name: 'Asha' });
  const service = createUserService({ repos: world.repos });
  return { world, asha, service };
}

describe('User service', () => {
  it('returns_an_active_users_profile', async () => {
    const { asha, service } = setup();

    expect(await service.get(asha.id)).toMatchObject({ id: asha.id, name: 'Asha' });
  });

  it.each([
    ['an unknown user', 'missing'],
    ['a deactivated user', 'gone-1'],
  ])('answers_not_found_for_%s', async (_label, id) => {
    const { world, service } = setup();
    world.addUser({ id: 'gone-1', active: false });

    await expect(service.get(id)).rejects.toMatchObject({ status: 404 });
  });

  it('saves_the_changes_and_clears_the_stale_embedding', async () => {
    const { world, asha, service } = setup();
    await world.repos.embeddings.setUser(asha.id, [1, 0]);

    const updated = await service.update(asha.id, { bio: 'New bio' });

    expect(updated.bio).toBe('New bio');
    expect(world.repos.embeddings.users.has(asha.id)).toBe(false);
  });
});
