# TESTING

> **Status: draft (end of Phase 1).** Only the health check is tested so far. The table is filled in as each rule gets its tests (Phases 2–6); nothing is claimed that does not exist.

## Rules → tests

| # | Rule | Test `file:line` | Notes |
|---|---|---|---|
| 1 | Companion limit | _Phase 2_ | |
| 2 | Host decides | _Phase 3_ | |
| 3 | Auto-Close | _Phase 2_ | Boundary: start date is today (on-point) and yesterday/tomorrow (off-points). |
| 4 | Block | _Phase 3_ | |
| 5 | Companions become Friends | _Phase 2_ | |

**Rules tested: 0 of 5 (Phase 1).**

## Approach

- Core rules are plain functions tested without a database, network or LLM (Lecture 11–14).
- Time, the database and Gemini enter through injected ports; tests pass fakes and stubs. Commands are mocked, queries are stubbed.
- Test names state behaviour in plain words; each test follows Arrange-Act-Assert with one Act (Lecture 7–8).
- Boundaries use on-point and off-point cases in parameterised tables (Lecture 9–10).
- Coverage is read as a negative indicator, to find untested code, not as a target.

## Weakest test

_Named honestly in Phase 6._

## Known gaps

_Listed in Phase 6, with what stops us testing each._
