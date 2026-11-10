# DESIGN

> **Status: draft (end of Phase 1).** Rules are fixed. The decisions and the boundary are filled in with real `file:line` references as the code lands (Phases 2–6). Nothing below cites code that does not exist yet.

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
| 1 | Single Responsibility (Lecture 17–18) | _to fill in Phase 3_ | _Plan routes held validation, rules and queries together → rules move into a plan service_ |
| 2 | Dependency Inversion (Lecture 17–18, 23) | _to fill in Phase 2_ | _Rules call `new Date()` and Prisma directly → they receive a Clock and a repository_ |
| 3 | Types as design (Lecture 24) | _to fill in Phase 2_ | _Statuses compared as free strings → enums parsed once at the edge_ |

Each row is completed with a `file:line`, a short code excerpt of the old shape, and the reason for the change.

## One boundary

**Planned:** the core rules sit inside; Postgres (Prisma), Gemini and Cloudinary sit outside behind ports (`PlanRepository`, `Clock`, `LlmClient`, `Embedder`). The dependency that this shields us from is the LLM provider and the database: the rules can be tested with in-memory fakes, and Gemini could be replaced by editing one adapter. Filled in with `file:line` in Phase 2 and Phase 5.

## AI use

See [`docs/AI_LOG.md`](docs/AI_LOG.md), which records tools, purpose, and rejected suggestions as they happen. The final summary and the one rejected suggestion are copied here in Phase 7.
