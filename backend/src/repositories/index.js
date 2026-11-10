import { makeBlockRepository, makeFriendshipRepository } from './friendship.repository.js';
import { makePlanRepository } from './plan.repository.js';
import { makeCompanionRepository, makeRequestRepository } from './request.repository.js';
import { makeUserRepository } from './user.repository.js';

// Every repository over one Prisma client. Passing a transaction client gives the same
// repositories bound to that transaction.
export function createRepositories(db) {
  return {
    users: makeUserRepository(db),
    plans: makePlanRepository(db),
    requests: makeRequestRepository(db),
    companions: makeCompanionRepository(db),
    friendships: makeFriendshipRepository(db),
    blocks: makeBlockRepository(db),
  };
}

// Unit of work: run `fn` with repositories bound to one transaction; any throw rolls back.
export function createUnitOfWork(prisma) {
  return {
    run: (fn) => prisma.$transaction((tx) => fn(createRepositories(tx)), { timeout: 10_000 }),
  };
}
