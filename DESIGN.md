# DESIGN

Terms come only from [`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md). Every `file:line` below is checked by `node scripts/verify-docs.mjs`. How each rule is tested is in [`TESTING.md`](TESTING.md).

## Five rules the product enforces

1. **Companion limit.** Accepted Companions on a Travel Plan never exceed its Max Companions; reaching the limit sets Plan Status to `FULL`.
2. **Host decides.** Only the Host of a Travel Plan can Accept or Reject its Join Requests.
3. **Auto-Close.** A Travel Plan becomes `CLOSED` once its start date has been reached, and a `CLOSED` plan takes no new Join Requests.
4. **Block.** A Blocked User cannot send the blocker a Join Request, Friend Request or Message.
5. **Companions become Friends.** Accepting a Join Request makes Host and Companion Friends, with at most one Friendship per pair.

The rules are plain functions in `backend/src/domain/` (`plan.js`, `request.js`, `block.js`, `friendship.js`, `chat.js`). The use cases in `backend/src/services/` call them inside one transaction. The race for the last spot is closed by locking the Travel Plan row (`backend/src/repositories/plan.repository.js:21`) and the pair of Friends is guarded by a unique index in the migration, so rules 1 and 5 hold even if the application code were bypassed or two requests collide.

## Three design decisions

| # | Principle | Where | Before → after |
|---|---|---|---|
| 1 | Single Responsibility, removing duplication (Lecture 4, 17–18, 25) | `backend/src/services/request.service.js:24`, `backend/src/services/request.service.js:31` | Accept, Reject and Cancel each repeated the same steps: load the Join Request, answer not found, lock the Travel Plan, check who may decide (`docs/evidence/before-request.service.js.txt:58`, `:77`, `:88`). The steps are now `loadForDecision` (accept, reject) and `findRequest` (cancel), used at `backend/src/services/request.service.js:72`, `:88` and `:96`. Each use case now reads as the rule it enforces. A behaviour-preserving change: all 25 request-service tests and the 18 joining integration tests passed unchanged before and after. |
| 2 | Dependency Inversion (Lecture 17–18, 23) | `backend/src/jobs/closePlans.js:4`, `backend/src/app.js:11`, `backend/src/container.js:15` | The Auto-Close job called `new Date()` and Prisma directly (`docs/evidence/before-closePlans.js.txt:7-8`), so it could only be run against a live database. `closeStartedPlans` now receives a Clock and a plan repository, `createApp(deps)` receives its collaborators (it was a module singleton, `docs/evidence/before-app.js.txt:9`), and `createServices` is the composition root that picks real implementations. Tests pass fakes; `backend/src/server.js:13` is where the real Gemini client is created. |
| 3 | Types as design, parse don't validate (Lecture 24) | `backend/src/domain/enums.js:5`, `backend/src/domain/enums.js:10`, `backend/src/validation/auth.schemas.js:8`, `backend/src/validation/itinerary.schema.js:29` | Plan Status was compared as the string literal `'CLOSED'` (`docs/evidence/before-closePlans.js.txt:8-9`). It is now a frozen enum, and `parseEnum` returns a member or `null`. Request bodies are parsed once by zod at the edge, so unknown fields such as `role` are dropped and services only see trusted values. The same idea guards the AI: a Generated Itinerary from the model is untrusted text, parsed by one schema that requires at least one day and one activity per day, and rejected rather than trimmed when it is too long. |

## One boundary

The core rules (`backend/src/domain/plan.js`, `backend/src/domain/friendship.js`) sit inside. They import nothing from Express, Prisma, Node I/O or Gemini, only each other. The use cases (`backend/src/services/`) and the AI logic (`backend/src/ai/`) depend inward on the rules and on ports, never on a vendor. Outside sit Postgres, bcrypt, the system clock and Gemini. The ports are documented at `backend/src/domain/ports.js:1` and, for the AI, `backend/src/ai/ports.js:1` (`LlmClient` and `Embedder`).

| Port | Adapter (outside) | Test double |
|---|---|---|
| Repositories, unit of work | `backend/src/repositories/plan.repository.js:13`, `backend/src/repositories/user.repository.js:6`, `backend/src/repositories/index.js:1` | in-memory `world` (`backend/tests/helpers/world.js:6`) |
| `PasswordHasher` | `backend/src/adapters/bcryptHasher.js:5` | `backend/tests/helpers/fakes.js:29` |
| `Clock` | `backend/src/adapters/systemClock.js:1` | a fixed clock |
| `LlmClient`, `Embedder` | `backend/src/ai/gemini.js:55` (one object serving both) | `backend/tests/helpers/aiFakes.js:3` (scripted LLM) and a deterministic Embedder in `backend/tests/ai.service.test.js` |

The dependency this shields us from is the database, the wall clock and a third-party AI service that is slow, costs money, can be down and gives different answers each time. The rules run in milliseconds with plain objects and a fixed time. If Gemini is replaced, only `gemini.js` changes. If the Embedder is down, Recommended for You falls back to Interests and dates (`backend/src/services/ai.service.js:38`), and an unusable model answer becomes a clear 502 or 503 instead of a crash.

## AI features and how they are bounded

| Feature | Where | Design choice |
|---|---|---|
| Itinerary Generator | `backend/src/ai/itinerary/generate.js` | Output must pass one zod schema; one retry feeds the parse error back to the model; user text goes in the user message, never the system prompt. |
| Recommended for You, Best Match | `backend/src/ai/matching/rank.js`, `backend/src/services/ai.service.js` | Embeddings are stored in pgvector, but the score is computed in JavaScript from similarity, shared Interests and date overlap, so each Match Reason can be explained in words and the ranking tested without a model. A missing Embedding scores 0 similarity instead of failing. |
| Travel Assistant | `backend/src/ai/assistant/assistant.js`, `backend/src/ai/assistant/tools.js` | The model can only call two read-only tools, whose results are projected to an allow-list of fields so private data cannot leak; the loop stops after 5 steps. |
| Cost control | `backend/src/middleware/rateLimit.js`, `backend/src/services/ai.service.js` | 20 itinerary or assistant calls per user per hour; at most 15 new Embeddings of each kind per request. |

## AI use

See [`docs/AI_LOG.md`](docs/AI_LOG.md) for the tools used, scope decisions and the rejected suggestion. Claude Code helped write code, tests and drafts of these documents; the team owns and must be able to explain every file. The Gemini API is a product feature, not a development tool.
