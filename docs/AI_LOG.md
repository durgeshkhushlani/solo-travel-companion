# AI use log

Running record for the "AI use" section of `DESIGN.md`. Add an entry whenever an AI tool shapes a file, and always when we reject a suggestion. Every member must be able to explain the code listed here.

## Tools

| Tool | Used for |
|---|---|
| Claude Code | Scaffolding, tests, documentation drafts, refactoring suggestions |
| Gemini API | A product feature, not a dev tool: Itinerary Generator, Embeddings, Travel Assistant |

## Rejected suggestions

Record only suggestions that really happened: what the tool proposed, who rejected it, and why. `DESIGN.md` needs one real entry by Phase 7. One is recorded below. Team members: add your own when you reject a suggestion in review.

| Date | Phase | Suggestion | Rejected by | Why |
|---|---|---|---|---|
| 2026-11-10 | 3 | Claude Code drafted an integration test named as a CSRF check that never omitted the CSRF header, so it could pass with CSRF protection removed. | Claude Code, on re-reading its own draft before commit (team to confirm in review) | A test whose name promises more than it checks is a test smell (Lecture 15–16). Replaced by two tests that each do what they say: `backend/tests/integration/plans.int.test.js:62` sends no CSRF header and expects 403. |

## Scope decisions made with AI help

These are our decisions, not rejected suggestions.

| Date | Phase | Decision | Why |
|---|---|---|---|
| 2026-11-10 | 1 | Remove Redis; the Explore Feed queries Postgres directly | A cache adds a service and an invalidation rule; not needed at our size (YAGNI, Lecture 25). |
| 2026-11-10 | 1 | Drop Community Room, Featured Package and Moderation Flag | Extra models and screens that teach nothing the course grades. |
