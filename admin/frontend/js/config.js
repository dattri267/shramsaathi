// ---------------------------------------------------------
// Central place to point the admin dashboard at your servers.
// Change these two lines if your ports/hosts are different.
// ---------------------------------------------------------
const CONFIG = {
  // Node/Express backend (Prisma + Postgres) — the shramsaathi backend/ folder
  BACKEND_API_BASE: 'http://localhost:8000/api',

  // Python FastAPI demand/pricing model — admin/ai-engine folder
  AI_ENGINE_BASE: 'http://localhost:8001'
};