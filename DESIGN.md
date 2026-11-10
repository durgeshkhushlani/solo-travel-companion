# DESIGN

> **Status: draft (end of Phase 2).** Rules are fixed. Decisions 2 and 3 and the boundary cite code that exists today; decision 1 and the AI side of the boundary land in Phases 3 and 5. Every `file:line` is re-verified in Phase 7.

Terms come only from [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md).

## Five rules the product enforces

1. **Companion limit.** Accepted Companions on a Travel Plan never exceed its Max Companions; reaching the limit sets Plan Status to `FULL`.
2. **Host decides.** Only the Host of a Travel Plan can Accept or Reject its Join Requests.
3. **Auto-Close.** A Travel Plan becomes `CLOSED` once its start date has passed, and a `CLOSED` plan takes no new Join Requests.
4. **Block.** A Blocked User cannot send the blocker a Join Request, Friend Request or Message.
5. **Companions become Friends.** Accepting a Join Request makes Host and Companion Friends, with at most one Friendship per pair.

## Three design decisions

| # | Principle | Where | Before → after |
|---|---|---|---|
| 1 | Single Responsibility (Lecture 17–18) | _Phase 3_ | _Plan handlers will hold validation, rules and queries together → rules move into a plan service_ |
| 2 | Dependency Inversion (Lecture 17–18, 23) | `backend/src/jobs/closePlans.js:4`, `backend/src/app.js:11` | The Auto-Close job called `new Date()` and Prisma directly (`docs/evidence/before-closePlans.js.txt:7-8`), so it could only be exercised against a live database. `closeStartedPlans` now receives a Clock and a plan repository, and `createApp(deps)` receives its collaborators (was a module singleton, `docs/evidence/before-app.js.txt:9` and `:22`). `server.js` is the one place that names the real adapters. |
| 3 | Types as design (Lecture 24) | `backend/src/domain/enums.js:5`, `backend/src/domain/enums.js:10`, `backend/src/validation/auth.schemas.js:8` | Plan Status was compared as the string literal `'CLOSED'` (`docs/evidence/before-closePlans.js.txt:8-9`). It is now a frozen enum, and `parseEnum` returns a member or `null`. Register and login input is parsed once by zod at the edge, and unknown fields such as `role` are dropped, so the service only sees trusted values. |

## One boundary

The core rules (`backend/src/domain/plan.js`, `backend/src/domain/friendship.js`) sit inside. They import nothing from Express, Prisma or Node I/O. Postgres, bcrypt and the system clock sit outside, behind the ports documented at `backend/src/domain/ports.js:1`; their adapters are `backend/src/repositories/plan.repository.js:4`, `backend/src/repositories/user.repository.js:7`, `backend/src/adapters/bcryptHasher.js:5` and `backend/src/adapters/systemClock.js:1`.

The dependency this shields us from is the database and the wall clock: the rules run in milliseconds with plain objects and a fixed time, and the auth routes are tested against in-memory fakes (`backend/tests/helpers/fakes.js:2`). The `LlmClient` and `Embedder` ports for Gemini are added in Phase 5 and will be cited here.

**Not yet wired:** rules 1 and 5 exist as pure functions with tests but no HTTP flow calls them until the Join Request endpoints land in Phase 3.

## AI use

See [`docs/AI_LOG.md`](docs/AI_LOG.md), which records tools, purpose, and rejected suggestions as they happen. The final summary and the one rejected suggestion are copied here in Phase 7.
