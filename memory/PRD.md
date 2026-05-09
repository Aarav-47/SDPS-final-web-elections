# SDPS Election — PRD

## Original problem statement (2026-05-09)
> Check error for this and add Frontend Vercel, backend Azure, database Azure, and if you want to access anything except homepage, vote page or notice-board page, credentials required and redirect to what they wanted to access. Plus tips to fasten up the servers.

## Architecture
- Frontend: React (CRA) deployed on **Vercel** at `https://sdps-election-web.vercel.app`
- Backend: FastAPI (Python 3.11) on **Azure App Service Linux** at `https://sdps-election-rg-d9cqbwakd4exb8d0.centralindia-01.azurewebsites.net`
- Database: **MongoDB Atlas** (M0/M2 cluster) at `mongodb+srv://...sdps-election-server...mongodb.net`
- Auth: JWT-based admin login (single seeded school admin, `Aarav` / `Krish@2026`)

## Public vs protected routes
| Public                          | Protected (admin login required, with redirect-back) |
|---------------------------------|------------------------------------------------------|
| `/`, `/confirm`, `/vote`, `/thank-you`, `/board`, `/admin/login` | `/results`, `/admin`, `/admin/declaration` |

## Implemented (2026-05-09)
- **Fixed critical bug**: `backend/server.py` was completely duplicated (1396 → ~850 lines). First copy used undefined `MongoClient` (silent crash in try/except), second copy was the real app. Removed duplication.
- **MongoDB Atlas wired in** as a built-in default in `server.py` — backend auto-connects with **zero env-var config** on Azure.
- **Real root cause of 30-second category lag identified and fixed**: candidate photos were stored as **base64 data-URIs** inside Mongo docs, making `/api/candidates` 12 MB.
  - New `_lighten_candidate()` strips data-URIs in list responses, replacing with lazy URLs.
  - New `/api/candidates/{id}/photo` and `/api/candidates/{id}/symbol` stream image bytes with `Cache-Control: public, max-age=86400, immutable` (1-day browser cache).
  - `/api/bootstrap` response dropped from **12.6 MB → ~5 KB** (2,500× smaller).
- **One-shot kiosk load**: `/api/bootstrap` returns posts + lightweight candidates + settings in a single round-trip; `VotePage` pre-fetches once → category navigation is instant.
- **MongoDB indexes** via `ensure_indexes()` on `users.admission_no`, `votes.admission_no`, `candidates.id` & `candidates.post`, `posts.key`, `admins.username`, `settings.key`.
- **Auth wall + redirect-back**: `RequireAdmin` HOC guards `/results`, `/admin`, `/admin/declaration`; backend `/api/results` requires admin token.
- **Lazy images** (`loading="lazy" decoding="async"`) on candidate cards.
- Added `dnspython` for `mongodb+srv://` URLs.
- CORS default allows `https://sdps-election-web.vercel.app` + `http://localhost:3000`.
- Created `frontend/vercel.json`, `frontend/.env.example`, `backend/.env.example`, `DEPLOYMENT.md`.

## Action items for the user
1. **Push to GitHub** (`git add . && git commit -m "speed+auth fixes" && git push`) → Vercel and Azure auto-redeploy.
2. In **Vercel → Project → Environment Variables**, confirm `REACT_APP_BACKEND_URL` = `https://sdps-election-rg-d9cqbwakd4exb8d0.centralindia-01.azurewebsites.net` (no trailing slash, no `/api`). Click **Redeploy**.
3. In **Azure App Service → Configuration**, enable **Always On** (Settings → General settings) to eliminate cold starts.

## Backlog
- [P2] Server-side photo thumbnail generation (Pillow) on upload to keep DB lean.
- [P2] Audit log for admin vote-edit / vote-delete (compliance).
- [P3] Self-service "change admin password" endpoint.
- [P3] Azure Front Door for global edge caching.
- [P3] Live confetti ticker on `/board` (turnout-only SSE) for engagement on election day.

## Smart enhancement
On election day, why not add a **live confetti pulse** on `/board` every time a ballot is cast (turnout-only, results-safe) via tiny SSE on `/api/board/stream`? Keeps the queue engaged, drives turnout via word-of-mouth.
