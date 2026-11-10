# AI use log

Running record for the "AI use" section of `DESIGN.md`. Add an entry whenever an AI tool shapes a file, and always when we reject a suggestion. Every member must be able to explain the code listed here.

## Tools

| Tool | Used for |
|---|---|
| Claude Code | Scaffolding, tests, documentation drafts, refactoring suggestions |
| Gemini API | A product feature, not a dev tool: Itinerary Generator, Embeddings, Travel Assistant |

## Rejected suggestions

Record only suggestions that really happened: what the tool proposed, who rejected it, and why. `DESIGN.md` needs one real entry by Phase 7. None recorded yet.

| Date | Phase | Suggestion | Rejected by | Why |
|---|---|---|---|---|
| | | | | |

## Scope decisions made with AI help

These are our decisions, not rejected suggestions.

| Date | Phase | Decision | Why |
|---|---|---|---|
| 2026-11-10 | 1 | Remove Redis; the Explore Feed queries Postgres directly | A cache adds a service and an invalidation rule; not needed at our size (YAGNI, Lecture 25). |
| 2026-11-10 | 1 | Drop Community Room, Featured Package and Moderation Flag | Extra models and screens that teach nothing the course grades. |
