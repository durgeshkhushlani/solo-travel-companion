import { FriendStatus, PlanStatus, RequestStatus } from '../../src/domain/enums.js';
import { BEFORE_START } from './factories.js';

// An in-memory stand-in for every repository port plus the unit of work. A fake: it works,
// but search() does no filtering; filtering is proven against real Postgres instead.
export function createWorld({ now = BEFORE_START } = {}) {
  const db = {
    users: [],
    plans: [],
    requests: [],
    companions: [],
    friendships: [],
    blocks: [],
    messages: [],
  };
  let seq = 0;
  const newId = (prefix) => `${prefix}-${++seq}`;
  const clock = { now: () => new Date(world.now) };

  const summary = (u) => ({ id: u.id, name: u.name, photoUrl: u.photoUrl ?? null });
  const acceptedCount = (planId) => db.companions.filter((c) => c.planId === planId).length;
  const withExtras = (plan) =>
    plan && {
      ...plan,
      host: summary(db.users.find((u) => u.id === plan.hostId) ?? { id: plan.hostId, name: '?' }),
      acceptedCount: acceptedCount(plan.id),
    };
  const pairMatches = (m, a, b) =>
    (m.senderId === a && m.receiverId === b) || (m.senderId === b && m.receiverId === a);
  const samePair = (f, a, b) =>
    (f.requesterId === a && f.addresseeId === b) || (f.requesterId === b && f.addresseeId === a);

  const repos = {
    users: {
      async findById(id) {
        return db.users.find((u) => u.id === id) ?? null;
      },
      async findByEmail(email) {
        return db.users.find((u) => u.email === email) ?? null;
      },
    },
    plans: {
      async findById(id) {
        return withExtras(db.plans.find((p) => p.id === id)) ?? null;
      },
      async findByIdForUpdate(id) {
        return repos.plans.findById(id);
      },
      async create(data) {
        const plan = { id: newId('plan'), createdAt: new Date(world.now), ...data };
        db.plans.push(plan);
        return withExtras(plan);
      },
      async update(id, data) {
        Object.assign(
          db.plans.find((p) => p.id === id),
          data,
        );
        return repos.plans.findById(id);
      },
      async setStatus(id, status) {
        db.plans.find((p) => p.id === id).status = status;
      },
      async remove(id) {
        db.plans = db.plans.filter((p) => p.id !== id);
      },
      async search(filters, { page, pageSize }) {
        const items = db.plans.map(withExtras);
        return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length };
      },
      async closeStartedBy(at) {
        const started = db.plans.filter((p) => p.status !== PlanStatus.CLOSED && p.startDate <= at);
        started.forEach((p) => (p.status = PlanStatus.CLOSED));
        return started.length;
      },
    },
    requests: {
      async find(id) {
        return db.requests.find((r) => r.id === id) ?? null;
      },
      async findByPlanAndUser(planId, userId) {
        return db.requests.find((r) => r.planId === planId && r.userId === userId) ?? null;
      },
      async create({ planId, userId }) {
        const request = {
          id: newId('req'),
          planId,
          userId,
          status: RequestStatus.PENDING,
          createdAt: new Date(world.now),
        };
        db.requests.push(request);
        return request;
      },
      async setStatus(id, status) {
        const request = db.requests.find((r) => r.id === id);
        request.status = status;
        return request;
      },
      async listForPlan(planId) {
        return db.requests.filter((r) => r.planId === planId).map(withRequestParts);
      },
      async listForUser(userId) {
        return db.requests.filter((r) => r.userId === userId).map(withRequestParts);
      },
    },
    companions: {
      async add(planId, userId) {
        db.companions.push({ planId, userId });
      },
      async remove(planId, userId) {
        db.companions = db.companions.filter((c) => !(c.planId === planId && c.userId === userId));
      },
      async has(planId, userId) {
        return db.companions.some((c) => c.planId === planId && c.userId === userId);
      },
      async list(planId) {
        return db.companions
          .filter((c) => c.planId === planId)
          .map((c) => summary(db.users.find((u) => u.id === c.userId)));
      },
    },
    friendships: {
      async findBetween(a, b) {
        return db.friendships.find((f) => samePair(f, a, b)) ?? null;
      },
      async find(id) {
        return db.friendships.find((f) => f.id === id) ?? null;
      },
      async create({ requesterId, addresseeId, status }) {
        const friendship = { id: newId('fr'), requesterId, addresseeId, status };
        db.friendships.push(friendship);
        return friendship;
      },
      async setStatus(id, status) {
        db.friendships.find((f) => f.id === id).status = status;
      },
      async remove(id) {
        db.friendships = db.friendships.filter((f) => f.id !== id);
      },
      async listAccepted(userId) {
        return db.friendships
          .filter(
            (f) =>
              f.status === FriendStatus.ACCEPTED &&
              (f.requesterId === userId || f.addresseeId === userId),
          )
          .map((f) => ({
            friendshipId: f.id,
            user: summary(
              db.users.find(
                (u) => u.id === (f.requesterId === userId ? f.addresseeId : f.requesterId),
              ),
            ),
          }));
      },
      async listPendingFor(userId) {
        return db.friendships
          .filter((f) => f.status === FriendStatus.PENDING && f.addresseeId === userId)
          .map((f) => ({
            friendshipId: f.id,
            user: summary(db.users.find((u) => u.id === f.requesterId)),
          }));
      },
    },
    messages: {
      async create({ senderId, receiverId, body }) {
        const message = {
          id: newId('msg'),
          senderId,
          receiverId,
          body,
          readAt: null,
          createdAt: new Date(world.now),
        };
        db.messages.push(message);
        return message;
      },
      async between(a, b) {
        return db.messages.filter((m) => pairMatches(m, a, b));
      },
      async last(a, b) {
        return db.messages.filter((m) => pairMatches(m, a, b)).at(-1) ?? null;
      },
      async unreadCount(fromId, toId) {
        return db.messages.filter(
          (m) => m.senderId === fromId && m.receiverId === toId && !m.readAt,
        ).length;
      },
      async markRead(fromId, toId, at) {
        db.messages
          .filter((m) => m.senderId === fromId && m.receiverId === toId && !m.readAt)
          .forEach((m) => (m.readAt = at));
      },
    },
    blocks: {
      async exists(blockerId, blockedId) {
        return db.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId);
      },
      async add(blockerId, blockedId) {
        if (!(await repos.blocks.exists(blockerId, blockedId))) {
          db.blocks.push({ blockerId, blockedId });
        }
      },
      async remove(blockerId, blockedId) {
        db.blocks = db.blocks.filter(
          (b) => !(b.blockerId === blockerId && b.blockedId === blockedId),
        );
      },
      async list(blockerId) {
        return db.blocks
          .filter((b) => b.blockerId === blockerId)
          .map((b) => summary(db.users.find((u) => u.id === b.blockedId)));
      },
    },
  };

  function withRequestParts(r) {
    const plan = db.plans.find((p) => p.id === r.planId);
    return {
      ...r,
      user: summary(db.users.find((u) => u.id === r.userId)),
      plan: { id: plan.id, title: plan.title, startDate: plan.startDate },
    };
  }

  const world = {
    db,
    repos,
    clock,
    now,
    uow: { run: (fn) => fn(repos) },
    addUser(overrides = {}) {
      const id = overrides.id ?? newId('user');
      const user = {
        id,
        name: `User ${id}`,
        email: `${id}@example.com`,
        role: 'USER',
        active: true,
        interests: [],
        ...overrides,
      };
      db.users.push(user);
      return user;
    },
    addPlan(overrides = {}) {
      const plan = {
        id: newId('plan'),
        hostId: 'host-1',
        title: 'Spiti in March',
        destination: 'Spiti',
        status: PlanStatus.OPEN,
        startDate: new Date('2027-03-01T00:00:00.000Z'),
        endDate: new Date('2027-03-07T00:00:00.000Z'),
        interests: [],
        maxCompanions: 2,
        itinerary: [],
        createdAt: new Date(now),
        ...overrides,
      };
      db.plans.push(plan);
      return plan;
    },
    addCompanion(planId, userId) {
      db.companions.push({ planId, userId });
    },
  };
  return world;
}
