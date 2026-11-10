// Ports: what the core needs from the outside world. Adapters live in src/adapters,
// src/repositories and src/ai/gemini.js; the core never imports them (Lecture 23, dependency rule).

/**
 * The current time. Production: systemClock. Tests: a fixed clock.
 * @typedef {{ now(): Date }} Clock
 */

/**
 * @typedef {{
 *   hash(plain: string): Promise<string>,
 *   verify(plain: string, hash: string): Promise<boolean>
 * }} PasswordHasher
 */

/**
 * Repositories (src/repositories/*.repository.js) return plain objects. The ones the rules lean
 * on most:
 * - plans.findByIdForUpdate(id) locks the Travel Plan row until the transaction ends, so two
 *   accepts for the last spot are serialised.
 * - plans.closeStartedBy(now) sets Plan Status to CLOSED for every non-closed Travel Plan whose
 *   start date is on or before `now` and returns how many changed.
 * - embeddings.getPlans/getUsers(ids) return a Map of id to number[] for rows that have one.
 * @typedef {Record<string, Record<string, Function>>} Repositories
 */

/**
 * Unit of work: `run(fn)` calls `fn` with transaction-bound repositories and commits if it
 * resolves, rolls back if it throws. Production: Prisma `$transaction`. Tests: the in-memory world.
 * @typedef {{ run<T>(fn: (tx: Repositories) => Promise<T>): Promise<T> }} UnitOfWork
 */

/**
 * The AI ports (LlmClient, Embedder) are declared in src/ai/ports.js.
 */

export {};
