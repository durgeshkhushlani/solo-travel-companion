// Where the API lives. Empty means "same origin": in production Vercel forwards /api and
// /socket.io to the backend (vercel.json), so the browser sees one site and the Session
// cookies stay first-party. Locally the backend is on another port of localhost.
// VITE_API_URL overrides both (the docker-compose build sets it).
const fallback = import.meta.env.PROD ? '' : 'http://localhost:5000';
export const API_URL = import.meta.env.VITE_API_URL ?? fallback;
