import { spotsLeft, statusFor } from '../domain/plan.js';

// DTO shaping at the API boundary: never leak password hashes or other users' emails.
export function toUserDto(user, viewer) {
  const canSeeEmail = viewer && (viewer.id === user.id || viewer.role === 'ADMIN');
  return {
    id: user.id,
    name: user.name,
    bio: user.bio,
    photoUrl: user.photoUrl,
    interests: user.interests,
    travelStyle: user.travelStyle,
    role: user.role,
    ...(canSeeEmail && { email: user.email }),
  };
}

export const toSummary = (user) => ({
  id: user.id,
  name: user.name,
  photoUrl: user.photoUrl ?? null,
});

// The status is derived from the clock and the Companion count, so a plan whose trip has
// started reads CLOSED immediately instead of waiting for the hourly Auto-Close job.
export function toPlanDto(plan, now) {
  return {
    id: plan.id,
    title: plan.title,
    destination: plan.destination,
    description: plan.description ?? null,
    coverUrl: plan.coverUrl ?? null,
    startDate: plan.startDate,
    endDate: plan.endDate,
    interests: plan.interests,
    maxCompanions: plan.maxCompanions ?? null,
    acceptedCount: plan.acceptedCount,
    spotsLeft: spotsLeft(plan, plan.acceptedCount),
    status: statusFor(plan, plan.acceptedCount, now),
    itinerary: plan.itinerary,
    host: toSummary(plan.host),
    createdAt: plan.createdAt,
  };
}

export const toRequestDto = (request) => ({
  id: request.id,
  status: request.status,
  createdAt: request.createdAt,
  user: toSummary(request.user),
  plan: request.plan,
});
