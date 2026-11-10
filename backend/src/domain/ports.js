// Ports: what the core needs from the outside world. Adapters live in src/adapters and
// src/repositories; the core never imports them (Lecture 23, dependency rule).

/**
 * The current time. Production: systemClock. Tests: a fixed clock.
 * @typedef {{ now(): Date }} Clock
 */

/**
 * @typedef {{
 *   findByEmail(email: string): Promise<object | null>,
 *   findById(id: string): Promise<object | null>,
 *   create(data: { name: string, email: string, passwordHash: string }): Promise<object>
 * }} UserRepository
 */

/**
 * closeStartedBy sets Plan Status to CLOSED for every non-closed Travel Plan whose start
 * date is on or before `now`, and returns how many plans changed.
 * @typedef {{ closeStartedBy(now: Date): Promise<number> }} PlanRepository
 */

/**
 * @typedef {{
 *   hash(plain: string): Promise<string>,
 *   verify(plain: string, hash: string): Promise<boolean>
 * }} PasswordHasher
 */

export {};
