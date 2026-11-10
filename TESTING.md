# TESTING

> **Status: draft (end of Phase 2).** Rules 1, 3 and 5 are tested at the domain level. They are not yet exercised through HTTP, because the Join Request endpoints arrive in Phase 3. Nothing is claimed that does not exist.

## Rules → tests

| # | Rule | Test `file:line` | Notes |
|---|---|---|---|
| 1 | Companion limit | `backend/tests/domain/plan.test.js:70` (describe), `:89` (refuse at limit), `:71` (last spot sets FULL) | Domain function only; the concurrent-accept case (scenario F1.2) needs a transaction test in Phase 3. |
| 2 | Host decides | _Phase 3_ | |
| 3 | Auto-Close | `backend/tests/domain/plan.test.js:13` (on-point and off-points), `backend/tests/closePlans.test.js:6` | The SQL in `plan.repository.js:6` repeats the rule and is not tested without a database; see Known gaps. |
| 4 | Block | _Phase 3_ | |
| 5 | Companions become Friends | `backend/tests/domain/friendship.test.js:7` | Decision only; the write happens in Phase 3. |

**Rules tested: 3 of 5 at the domain level (rules 1, 3, 5). Rules 2 and 4 follow in Phase 3.**

**Suite size:** 86 tests across 9 files (`npm test` in `backend/`). Auth is also tested but is not one of the five rules: `backend/tests/auth.service.test.js`, `backend/tests/auth.routes.test.js`, `backend/tests/csrf.test.js`, `backend/tests/validation/auth.schemas.test.js`.

## Approach

- Core rules are plain functions tested without a database, network or LLM (Lecture 11–14).
- Time, the database and Gemini enter through injected ports; tests pass fakes and stubs. Commands are mocked, queries are stubbed.
- Test names state behaviour in plain words; each test follows Arrange-Act-Assert with one Act (Lecture 7–8).
- Boundaries use on-point and off-point cases in parameterised tables (Lecture 9–10).
- Coverage is read as a negative indicator, to find untested code, not as a target.

## Weakest test

_Named honestly in Phase 6._

## Known gaps

- `plan.repository.js` `closeStartedBy` is untested: it needs a real Postgres. The same rule is tested in `hasStarted`, but nothing proves the SQL agrees with it. Planned: an integration test against the compose Postgres in Phase 6.
- `user.repository.js` and `bcryptHasher.js` are untested for the same reason; the unique-email race in `create` is therefore unproven.
- No rate limiting on login, so there is nothing to test.
