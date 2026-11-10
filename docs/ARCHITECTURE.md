# Architecture

Two independent apps communicating over HTTP (REST) and WebSocket (Socket.IO).

## Backend (`backend/src`)
`routes → controllers → services → domain`, with `repositories` and `adapters` implementing the ports the domain and services declare. Plus `middleware` (auth, roles, CSRF), `validation` (zod schemas), `config`, `jobs` (node-cron), `ai` (itinerary, matching, assistant), `sockets`.

- `domain/`: pure rules and types (enums, plan, friendship, errors, port contracts). Imports nothing from Express, Prisma or Node I/O.
- `repositories/` and `adapters/`: Prisma, bcrypt and the system clock.
- `server.js` is the composition root; `createApp(deps)` takes its collaborators so tests can pass fakes.

- Auth: JWT in httpOnly cookie, SameSite, CSRF token (double-submit), bcrypt, CORS limited to the frontend origin with credentials.
- Roles: `USER` / `ADMIN` via role middleware.
- DTO mapping at the API boundary: never return password hashes or other users' emails.
- Cloudinary stores profile and cover images.

## Frontend (`frontend/src`)
`api`, `components`, `context` (auth, notifications), `hooks` (socket), `pages` (incl. `admin/`, `travel/`), `utils`.

## Data model highlights
- Unique friend pairs, companion limits and join-request states enforced by DB constraints.
- `TravelPlan.embedding` and `User.embedding` are pgvector columns queried via raw SQL.

## API areas
Auth, Users, Travel plans, Join requests, Friends, Messages, Admin, AI (itinerary, recommendations, assistant), Health.

## Real-time events
`private:message`, `join:event`.

## Deployment
Backend as Docker image; frontend as static build (Render/Vercel/Netlify). Prefer same-site domains so the login cookie works in all browsers.
