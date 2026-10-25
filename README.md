# Solo Travel Companion (STC)

**Connect · Explore · Travel Together**

A full-stack platform where solo travelers publish trips with day-by-day itineraries, find companions, join each other's plans, and chat in real time. Includes a public community room, an admin panel, and an AI layer.

## Structure

| Path | Purpose |
|------|---------|
| `backend/` | Node.js + Express REST API (`/api/**`), Socket.IO, Prisma + PostgreSQL/pgvector |
| `frontend/` | React 18 + Vite + Tailwind SPA |
| `docs/` | Architecture, API areas, team roadmap |
| `docker-compose.yml` | Postgres (pgvector), Redis, backend, frontend |

## Quick start

```bash
cp backend/.env.example backend/.env      # fill in secrets
docker compose up -d postgres redis       # databases only
cd backend && npm install && npx prisma migrate dev && npm run dev
cd frontend && npm install && npm run dev
```

Or run everything: `docker compose up --build`.

- Backend: http://localhost:5000 (health: `/health`)
- Frontend: http://localhost:5173

## Tech stack

Node/Express, PostgreSQL + pgvector (Prisma, raw SQL for vector queries), Socket.IO, Redis, Cloudinary, React 18, React Router 6, Vite, Tailwind, axios, Docker Compose. AI (itinerary generator, companion matching, travel assistant) is called from the backend via SDK.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ROADMAP.md](docs/ROADMAP.md).
