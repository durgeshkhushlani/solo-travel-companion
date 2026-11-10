# TESTING

Terms come only from [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md). Every `file:line` below is checked by `scripts/verify-docs.mjs` (run `node scripts/verify-docs.mjs`), which fails if a file or line does not exist.

## Rules → tests

Each rule is tested at two levels: the pure rule in `domain/` (no I/O), and the whole flow through HTTP against real Postgres (`*.int.test.js`). A third level, the service with in-memory fakes, sits between them.

| # | Rule | Domain / service tests | End-to-end test (real Postgres) |
|---|---|---|---|
| 1 | Companion limit | `backend/tests/domain/plan.test.js:73` (describe), `:74` (last spot sets FULL), `:92` (refuse at limit); `backend/tests/request.service.test.js:96`, `:105` | `backend/tests/integration/joining.int.test.js:51`; the race `:66` (two accepts, one spot) and `:80` (many simultaneous accepts) |
| 2 | Host decides | `backend/tests/domain/plan.test.js:118`; `backend/tests/request.service.test.js:118`, `:196` | `backend/tests/integration/joining.int.test.js:120`, `:133`, `:143` |
| 3 | Auto-Close | `backend/tests/domain/plan.test.js:16` (on-point and off-points), `:54`; `backend/tests/request.service.test.js:65` | `backend/tests/integration/joining.int.test.js:155`; SQL of the job: `backend/tests/integration/plans.int.test.js:188` |
| 4 | Block | `backend/tests/domain/block.test.js:5`; `backend/tests/request.service.test.js:46`, `:137` | `backend/tests/integration/joining.int.test.js:167`, `:176`, `:185` |
| 5 | Companions become Friends | `backend/tests/domain/friendship.test.js:7`; `backend/tests/request.service.test.js:82`, `:147`, `:161` | `backend/tests/integration/joining.int.test.js:197`, `:207`; the database index: `:218` |

**Rules tested: 5 of 5**, each at the domain, service and database level.

## Suite size

Counts come from the last full run (see `test_report.md` for the run log, which stays local):

| Suite | Command | Tests |
|---|---|---|
| Backend unit (no database, no network) | `npm test` in `backend/` | 403 in 28 files |
| Backend integration (real Postgres with pgvector, supertest, real sockets) | `npm run test:integration` in `backend/` | 72 in 6 files |
| Frontend (Vitest + Testing Library) | `npm test` in `frontend/` | 127 |

CI (`.github/workflows/ci.yml`) runs lint, format check, unit and integration tests, and the frontend tests and build on every push.

## Approach

- **Pure rules first.** `backend/src/domain/` imports nothing from Express, Prisma or Node I/O, so its tests need no setup (Lecture 11–14).
- **Test doubles by role.** Time, storage, hashing and Gemini enter through injected ports. Queries are stubbed and commands are verified (Lecture 11–12). The in-memory `world` (`backend/tests/helpers/world.js:6`) is a fake of all repositories at once; `createScriptedLlm` (`backend/tests/helpers/aiFakes.js:3`) is a scripted stub of the `LlmClient` port.
- **Arrange-Act-Assert**, one Act per test, names that state behaviour (Lecture 7–8, 15–16).
- **Boundaries** use on-point and off-point cases in parameterised tables, e.g. the start date itself for Auto-Close and the last free spot for the limit (Lecture 9–10).
- **Concurrency is tested, not assumed.** The race tests `backend/tests/integration/joining.int.test.js:66` and `:80` fire accepts at the same time. See mutation checks.
- **Coverage is a negative indicator**: it points to untested code and is not a target.

## Mutation checks

To check that the tests would notice a broken rule, we edited the rule by hand, ran the unit suite and restored the file. Every mutant was caught.

| Mutation | Rule | Result |
|---|---|---|
| `plan.js` `hasStarted`: `>=` to `>` (start date no longer counts) | 3 | 8 tests failed |
| `plan.js` `statusFor`: FULL when 1 spot is left instead of 0 | 1 | 17 failed |
| `plan.js` `assertHost`: check inverted | 2 | 34 failed |
| `plan.js` limit-below-accepted: `<` to `<=` | 1 | 2 failed |
| `request.js`: Host-cannot-join check inverted | 2 | 31 failed |
| `request.js`: must-be-pending check inverted | 2 | 18 failed |
| `friendship.js`: pending friendship branch changed | 5 | 3 failed |
| `chat.js`: chat-needs-Friends check inverted | – | 15 failed |

Earlier, removing `FOR UPDATE` from `findByIdForUpdate` (`backend/src/repositories/plan.repository.js:21`) made the integration race tests fail (`[200, 200]` instead of `[200, 409]`; 5 Companions accepted against a limit of 2). The lock was restored. This is the one check that only the integration suite can make, because the in-memory fake has no concurrency.

## Weakest test

`backend/tests/closePlans.test.js:6` is the weakest. It stubs the plan repository and checks that `closeStartedPlans` calls `closeStartedBy` once with the current time. That is an interaction test of a one-line function: it would still pass if the SQL were wrong. It is kept because it proves the job reads time from the injected Clock, but the rule itself is protected by the tests in the Rules table (rule 3), above all the on-point case in `backend/tests/integration/plans.int.test.js:188`.

## Characterization of legacy structure

Before refactoring `backend/src/services/request.service.js`, the 25 request-service tests (`backend/tests/request.service.test.js`) and the integration flow `backend/tests/integration/joining.int.test.js:21` already pinned its behaviour (Lecture 27). They passed unchanged before and after the refactor described in `DESIGN.md`, decision 1.

## Known gaps

- **Gemini is never called in tests.** `backend/src/ai/gemini.js` is tested against a fake `fetch` (`backend/tests/ai/gemini.test.js`), so request and response shapes follow the documentation but are unverified against the live API. Model quality (are itineraries good?) is not tested; only that bad output is rejected, retried once, then answered with 502.
- **Repositories show 0% in the unit coverage report** because they only run in the integration suite (`vitest.integration.config.js`). They are exercised by every `*.int.test.js`, but we do not merge the two coverage reports.
- **Sockets:** the message handler and authentication are unit-tested (`backend/tests/sockets.test.js`), and a real socket round trip is in `backend/tests/integration/chat.int.test.js`; reconnect behaviour is not tested.
- **Frontend styling and layout** are not tested; the frontend tests cover behaviour (`joinButtonState`, forms, API client), not appearance.
- **Rate limiter** is in memory and per process (`backend/tests/rateLimit.test.js`); with several server processes the limit would be per process.
- **No load or security scan** has been run.
