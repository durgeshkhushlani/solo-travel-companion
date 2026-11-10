# Solo Travel Companion (STC)

**Connect · Explore · Travel Together**

A full-stack platform where solo travelers publish trips with day-by-day itineraries, find companions, join each other's plans, and chat in real time. Includes a minimal admin panel and an AI layer.

## Structure

| Path | Purpose |
|------|---------|
| `backend/` | Node.js + Express REST API (`/api/**`), Socket.IO, Prisma + PostgreSQL/pgvector |
| `frontend/` | React 18 + Vite + Tailwind SPA |
| `docs/` | Architecture, API areas, team roadmap |
| `docker-compose.yml` | Postgres (pgvector), backend, frontend |

## Quick start

```bash
cp backend/.env.example backend/.env      # fill in secrets
docker compose up -d postgres             # database only
cd backend && npm install && npx prisma migrate dev && npm run dev
cd frontend && npm install && npm run dev
```

Or run everything: `docker compose up --build`.

- Backend: http://localhost:5000 (health: `/health`)
- Frontend: http://localhost:5173

## Tech stack

Node/Express, PostgreSQL + pgvector (Prisma, raw SQL for vector queries), Socket.IO, React 18, React Router 6, Vite, Tailwind, axios, Docker Compose. AI (itinerary generator, companion matching, travel assistant) uses the Gemini REST API from the backend; set `GEMINI_API_KEY` in `backend/.env` (without it the AI endpoints answer 503 and the rest of the app works).

See [DESIGN.md](DESIGN.md), [TESTING.md](TESTING.md), [UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/API.md](docs/API.md).

## Tests

```bash
cd backend && npm test                  # unit, no database
cd backend && npm run test:integration  # needs Postgres with pgvector (see TESTING.md)
cd frontend && npm test
```
