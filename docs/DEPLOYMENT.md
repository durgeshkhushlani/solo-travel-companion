# Deployment

- **Backend:** build `backend/Dockerfile`; set env vars from `backend/.env.example`. Migrations run on start (`prisma migrate deploy`). Needs Postgres with the `vector` extension and Redis.
- **Frontend:** `npm run build` in `frontend/`, host `dist/` on Render/Vercel/Netlify (SPA fallback to `index.html`). Set `VITE_API_URL` at build time.
- **Cookies:** serve frontend and API from the same site (e.g. `app.example.com` and `api.example.com`), set `COOKIE_SECURE=true` and `CLIENT_ORIGIN` to the frontend origin.
