import { FriendshipAction, friendshipOnAcceptance } from '../domain/friendship.js';
import { assertNotBlocked } from '../domain/block.js';
import { FriendStatus, RequestStatus } from '../domain/enums.js';
import { notFound } from '../domain/errors.js';
import { assertHost, statusAfterAccepting, statusFor } from '../domain/plan.js';
import {
  JoinAction,
  assertCanCancel,
  assertCanDecide,
  decideJoinRequest,
} from '../domain/request.js';
import { toPlanDto, toRequestDto, toSummary } from '../utils/dto.js';

// Join Request use cases. Every write locks the plan row first (findByIdForUpdate), so two
// accepts racing for the last spot are serialised and the second one sees the plan FULL.
export function createRequestService({ repos, uow, clock }) {
  const lockPlan = async (tx, id) => {
    const plan = await tx.plans.findByIdForUpdate(id);
    if (!plan) throw notFound('Travel Plan');
    return plan;
  };

  const present = async (tx, request, plan) =>
    toRequestDto({
      ...request,
      user: toSummary(await tx.users.findById(request.userId)),
      plan: { id: plan.id, title: plan.title, startDate: plan.startDate },
    });

  // Plan Status after the Companion count changes by `delta` (+1 accept, -1 leave or remove).
  const refreshStatus = (tx, plan, delta) =>
    tx.plans.setStatus(plan.id, statusFor(plan, plan.acceptedCount + delta, clock.now()));

  return {
    async send(userId, planId) {
      return uow.run(async (tx) => {
        const plan = await lockPlan(tx, planId);
        const existing = await tx.requests.findByPlanAndUser(planId, userId);
        const action = decideJoinRequest({
          plan,
          userId,
          acceptedCount: plan.acceptedCount,
          now: clock.now(),
          existing,
          blockedByHost: await tx.blocks.exists(plan.hostId, userId),
        });
        const request =
          action === JoinAction.REOPEN
            ? await tx.requests.setStatus(existing.id, RequestStatus.PENDING)
            : await tx.requests.create({ planId, userId });
        return present(tx, request, plan);
      });
    },

    // Rule 2 (Host decides), rule 1 (limit), rule 5 (Companions become Friends).
    async accept(actorId, requestId) {
      return uow.run(async (tx) => {
        const request = await tx.requests.find(requestId);
        if (!request) throw notFound('Join Request');
        const plan = await lockPlan(tx, request.planId);
        assertCanDecide({ plan, request, actorId });
        assertNotBlocked(await tx.blocks.exists(plan.hostId, request.userId));
        const statusAfter = statusAfterAccepting(plan, plan.acceptedCount, clock.now());

        const accepted = await tx.requests.setStatus(requestId, RequestStatus.ACCEPTED);
        await tx.companions.add(plan.id, request.userId);
        await tx.plans.setStatus(plan.id, statusAfter);
        await befriend(tx, plan.hostId, request.userId);

        const fresh = await tx.plans.findById(plan.id);
        return { request: await present(tx, accepted, plan), plan: toPlanDto(fresh, clock.now()) };
      });
    },

    async reject(actorId, requestId) {
      return uow.run(async (tx) => {
        const request = await tx.requests.find(requestId);
        if (!request) throw notFound('Join Request');
        const plan = await lockPlan(tx, request.planId);
        assertCanDecide({ plan, request, actorId });
        const rejected = await tx.requests.setStatus(requestId, RequestStatus.REJECTED);
        return present(tx, rejected, plan);
      });
    },

    async cancel(actorId, requestId) {
      return uow.run(async (tx) => {
        const request = await tx.requests.find(requestId);
        if (!request) throw notFound('Join Request');
        assertCanCancel({ request, actorId });
        const plan = await lockPlan(tx, request.planId);
        const cancelled = await tx.requests.setStatus(requestId, RequestStatus.CANCELLED);
        return present(tx, cancelled, plan);
      });
    },

    // Leave Trip: the request is cancelled so the User may ask again later.
    async leave(userId, planId) {
      return uow.run(async (tx) => {
        const plan = await lockPlan(tx, planId);
        await dropCompanion(tx, plan, userId, RequestStatus.CANCELLED);
      });
    },

    // Remove Companion: the Host decided, so the request reads REJECTED and cannot be repeated.
    async removeCompanion(actorId, planId, userId) {
      return uow.run(async (tx) => {
        const plan = await lockPlan(tx, planId);
        assertHost(plan, actorId);
        await dropCompanion(tx, plan, userId, RequestStatus.REJECTED);
      });
    },

    async listForPlan(actorId, planId) {
      const plan = await repos.plans.findById(planId);
      if (!plan) throw notFound('Travel Plan');
      assertHost(plan, actorId);
      return (await repos.requests.listForPlan(planId)).map(toRequestDto);
    },

    async mine(userId) {
      return (await repos.requests.listForUser(userId)).map(toRequestDto);
    },

    async companions(planId) {
      if (!(await repos.plans.findById(planId))) throw notFound('Travel Plan');
      return repos.companions.list(planId);
    },
  };

  async function dropCompanion(tx, plan, userId, requestStatus) {
    if (!(await tx.companions.has(plan.id, userId))) throw notFound('Companion');
    await tx.companions.remove(plan.id, userId);
    const request = await tx.requests.findByPlanAndUser(plan.id, userId);
    if (request) await tx.requests.setStatus(request.id, requestStatus);
    await refreshStatus(tx, plan, -1);
  }

  async function befriend(tx, hostId, companionId) {
    const existing = await tx.friendships.findBetween(hostId, companionId);
    const decision = friendshipOnAcceptance({ hostId, companionId, existing });
    if (decision.action === FriendshipAction.CREATE) {
      await tx.friendships.create({
        requesterId: decision.requesterId,
        addresseeId: decision.addresseeId,
        status: decision.status,
      });
    } else if (decision.action === FriendshipAction.ACCEPT_EXISTING) {
      await tx.friendships.setStatus(decision.friendshipId, FriendStatus.ACCEPTED);
    }
  }
}
