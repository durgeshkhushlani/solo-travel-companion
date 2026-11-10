import { createRepositories, createUnitOfWork } from './repositories/index.js';
import { createAiService } from './services/ai.service.js';
import { createAuthService } from './services/auth.service.js';
import { createAdminService } from './services/admin.service.js';
import { activeSession } from './middleware/sessionGuard.js';
import { createFriendService } from './services/friend.service.js';
import { createMessageService } from './services/message.service.js';
import { createPlanService } from './services/plan.service.js';
import { createRequestService } from './services/request.service.js';
import { createUserService } from './services/user.service.js';

// Composition root: the one place that picks the real implementations behind the ports.
// server.js uses it with the real clock and bcrypt; integration tests use it with a test
// database and a fixed clock.
export function createServices({ prisma, clock, hasher, llm, embedder }) {
  const repos = createRepositories(prisma);
  const uow = createUnitOfWork(prisma);
  return {
    repos,
    uow,
    clock,
    auth: createAuthService({ users: repos.users, hasher }),
    users: createUserService({ repos }),
    plans: createPlanService({ repos, uow, clock }),
    requests: createRequestService({ repos, uow, clock }),
    friends: createFriendService({ repos, uow }),
    messages: createMessageService({ repos, uow, clock }),
    admin: createAdminService({ repos, clock }),
    ai: createAiService({ repos, llm, embedder, clock }),
    sessionGuard: activeSession(repos.users),
  };
}
