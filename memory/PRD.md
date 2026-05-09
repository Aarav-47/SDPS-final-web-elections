# SDPS Election — PRD

## Original problem statement (2026-05-09)
> Check error for this and add Frontend Vercel, backend Azure, database Azure, and if you want to access anything except homepage, vote page or notice-board page, credentials required and redirect to what they wanted to access. Plus tips to fasten up the servers.

## Architecture
- Frontend: React (CRA) deployed on **Vercel** at `https://sdps-election-web.vercel.app`
- Backend: FastAPI (Python 3.11) on **Azure App Service Linux** at `https://sdps-election-rg-d9cqbwakd4exb8d0.centralindia-01.azurewebsites.net`
- Database: **Azure Cosmos DB for MongoDB** API
- Auth: JWT-based admin login (single seeded school admin)

## User personas
- **Voter (student/teacher)** — anonymous, kiosk-style flow on `/`, `/vote`, `/thank-you`.
- **Public observer** — anonymous, sees only `/board` (turnout, no leaders).
- **School admin** — authenticated, full control of users/candidates/categories/results/declaration.

## Public vs protected routes
| Public                          | Protected (admin login required, with redirect-back) |
|---------------------------------|------------------------------------------------------|
| `/`, `/confirm`, `/vote`, `/thank-you`, `/board`, `/admin/login` | `/results`, `/admin`, `/admin/declaration` |

## Implemented (2026-05-09)
- **Fixed critical bug**: `backend/server.py` was completely duplicated (1396 → 767 lines). First copy used undefined `MongoClient` (silent crash in try/except), second copy was the real app. Removed duplication, single clean motor-based async Mongo client.
- **Fixed slow per-category load** (was 30 s for 2nd/3rd/4th category):
  - Added `/api/bootstrap` endpoint → returns posts + candidates + settings in 1 round-trip.
  - VotePage now pre-fetches all candidates **once** and slices by category in memory (zero per-step latency).
  - Added MongoDB indexes on `admission_no`, `votes.admission_no`, `candidates.post`, `posts.key`, `admins.username`, `settings.key` via `ensure_indexes()` startup hook.
  - Bulk candidate validation in `/api/votes` (1 query instead of N).
- **Auth wall + redirect**:
  - New `RequireAdmin` HOC wraps `/results`, `/admin`, `/admin/declaration`.
  - Anonymous users → redirected to `/admin/login?redirect=<original-path>`.
  - After login, AdminLogin reads `?redirect=` and navigates back to the requested page.
  - Backend `/api/results` is now admin-protected too (token required).
- **Deployment configs**:
  - `frontend/vercel.json` — SPA rewrites + asset cache headers.
  - `frontend/.env.example`, `backend/.env.example` — documented env vars.
  - `DEPLOYMENT.md` — step-by-step Vercel + Azure + Cosmos DB guide.
- **Speed-up tips** documented in `DEPLOYMENT.md`: Always On, region co-location, RU autoscale, indexes, gunicorn keep-alive, Front Door optional.
- **Backwards compat**: `MONGO_URL` is preferred but `MONGO_URI` (Azure Portal naming) still works.

## Backlog / Next action items
- [P1] Push the updated repo to GitHub → Vercel re-deploys frontend automatically; Azure picks up the new `server.py` after a deployment trigger.
- [P1] In Azure Portal → App Service → Configuration: set `JWT_SECRET`, confirm `MONGO_URL` (or rename `MONGO_URI` → `MONGO_URL`), set `CORS_ORIGINS=https://sdps-election-web.vercel.app`, enable **Always On**, then **Restart**.
- [P1] In Vercel: confirm `REACT_APP_BACKEND_URL` matches the Azure URL **without a trailing slash**.
- [P2] Add health-check ping path `/api/health` to Azure (already implemented in code).
- [P2] Consider Azure Front Door for global edge / auto-warming.
- [P3] Audit log for vote-edit / vote-delete by admin (compliance).
- [P3] Stronger admin password policy + rotate seeded password on first login.

## Smart enhancement idea
For election day, add a lightweight **public live ticker** on `/board` (already turnout-only) that pushes a confetti animation each time a vote is cast — keeps voters engaged in the queue and increases word-of-mouth turnout without leaking any candidate-level data. Tiny socket.io or Server-Sent-Events on `/api/board/stream` would do it.
