# Deployment (Render for the API, Vercel for the web app)

## Why the setup looks like this

Vercel (`*.vercel.app`) and Render (`*.onrender.com`) are different sites. Browsers would treat the Session cookie as third-party: it would not be sent, and the frontend could not read the `stc_csrf` cookie needed for the CSRF header (`backend/src/middleware/csrf.js`). So Vercel **forwards** `/api/*` and `/socket.io/*` to Render (`frontend/vercel.json`). The browser then talks only to the Vercel origin, the cookies stay first-party, and no auth code had to change. Production builds call the same origin by default.

## Steps

1. **Render (backend + database).** New → Blueprint → select this repository (`render.yaml`). Enter `CLIENT_ORIGIN` (your Vercel URL, no trailing slash) and `GEMINI_API_KEY`. Render builds `backend/Dockerfile`, which runs `prisma migrate deploy` (this also enables the `vector` extension) and starts the server. Check `https://<service>.onrender.com/health`.
2. **Vercel (frontend).** Import the repository, set Root Directory to `frontend`, framework Vite. Leave `VITE_API_URL` unset: production builds default to the same origin (`frontend/src/api/config.js`). Before deploying, edit `frontend/vercel.json` and replace `YOUR-BACKEND` with your Render service name.
3. **Back to Render.** Make sure `CLIENT_ORIGIN` equals the final Vercel URL, then redeploy.
4. **Make an admin.** In the Render shell: `npm run make-admin -- you@example.com`.

## Things to know

- **Gemini key:** without `GEMINI_API_KEY` the AI endpoints answer 503 and the rest of the app works. Model names are `GEMINI_MODEL` and `GEMINI_EMBEDDING_MODEL` (defaults in `backend/src/config/env.js`).
- **Free-plan sleep:** a sleeping Render service wakes on the first request (about 30 s). The hourly Auto-Close job does not run while it sleeps, but rule 3 does not depend on it: a started plan is reported `CLOSED` and refuses Join Requests whenever it is read or written (`backend/src/domain/plan.js:5`).
- **Chat through Vercel:** Vercel cannot forward WebSockets, so Socket.IO uses long polling there (`frontend/src/hooks/useSocket.js`). Messages work but can arrive up to a moment later than over WebSockets. A custom domain for both apps (e.g. `app.` and `api.` on one site) would allow direct WebSockets; then set `VITE_API_URL` to the API URL.
- **Fail-fast config:** in production the server refuses to start without `JWT_SECRET` and `COOKIE_SECURE=true` (`backend/src/config/assertProductionConfig.js`).
- **Not verified by us:** none of this has been deployed or tested on Vercel/Render yet, including the Vercel rewrite of Set-Cookie headers and long polling through it. Check login, creating a plan and chat first.

## Local run

```bash
docker compose up -d postgres
cd backend && cp .env.example .env && npm install && npx prisma migrate deploy && npm run dev
cd frontend && npm install && npm run dev
```
