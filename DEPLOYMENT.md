# SDPS Election — Deployment Guide

Stack: **React (Vercel)** + **FastAPI (Azure App Service Linux)** + **Cosmos DB for MongoDB**.

---

## 1. Frontend → Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project** → import the repo → set **Root Directory** to `frontend`.
3. Framework preset: `Create React App` (auto-detected).
4. **Environment Variables** (Production + Preview):
   - `REACT_APP_BACKEND_URL` = `https://sdps-election-rg-d9cqbwakd4exb8d0.centralindia-01.azurewebsites.net`
     (no trailing slash, no `/api`)
5. Deploy. `vercel.json` already configures SPA rewrites and asset caching.

> After every Vercel deploy: do a hard refresh (Ctrl+Shift+R) to bust old service-worker caches.

---

## 2. Database → Azure Cosmos DB for MongoDB

1. Azure Portal → **Create resource** → **Azure Cosmos DB** → **MongoDB API**.
2. Use **provisioned throughput** with **400 RU/s autoscale** (cheap, fast enough for a school election).
3. Region: same region as your App Service (e.g., **Central India**) — *critical* for low latency.
4. Once created → **Connection strings** → copy the **Primary connection string**.
5. Append `&retrywrites=false` if not already present (Cosmos requires it).

---

## 3. Backend → Azure App Service (Linux, Python 3.11)

### Code layout expected by Azure
Azure’s Oryx builder needs `requirements.txt` and the entrypoint at the **deployment root**.
Two clean options:

**Option A (recommended): deploy only `backend/` as the Azure app.**
   - In your GitHub Action / Azure Deployment Center, set the **package path** to `backend`.

**Option B: keep monorepo and use `appCommandLine`.**
   - Already configured in your portal: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app`.

### Required Application Settings (Configuration → Application settings)

| Key             | Value                                                                              |
|-----------------|------------------------------------------------------------------------------------|
| `MONGO_URL`     | `mongodb://<acct>:<key>@<acct>.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false` |
| `DB_NAME`       | `sdps-election`                                                                    |
| `JWT_SECRET`    | a long random string (≥ 32 chars)                                                  |
| `CORS_ORIGINS`  | `https://sdps-election-web.vercel.app`                                             |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true`                                                            |
| `WEBSITES_PORT` | `8000`                                                                             |

### Startup command
```
gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --timeout 120 --keep-alive 5 --access-logfile '-'
```

### Verify
After deploy, hit:
- `https://<your-app>.azurewebsites.net/api/health` → `{"ok":true,...}`
- `https://<your-app>.azurewebsites.net/api/posts` → list of categories

If you see `Application startup complete` in **Log stream**, the API is up. The lines you saw earlier (`SDPS Election API started`) **were not errors** — they were normal startup logs.

---

## 4. Speed-up tips (cold-start & Cosmos latency)

### A. Eliminate Azure cold starts
- App Service → **Configuration → General settings → Always On = ON** (requires Basic B1+).
- App Service → **Configuration → Path mappings → Health check path** = `/api/health`. Azure will warm the app and recycle bad instances automatically.
- Enable **HTTP/2** (Configuration → General settings → HTTP version 2.0).

### B. Co-locate region
- Cosmos DB **must** be in the same region as App Service (e.g., both Central India). Cross-region adds 50–200 ms per query.

### C. Cosmos RU & indexing
- Default Mongo API auto-indexes everything — that’s expensive. We added explicit indexes in `ensure_indexes()` for `admission_no`, `votes.admission_no`, `candidates.post`, `posts.key`. This was the main reason category-2/3/4 were taking 30 s.
- If you still see lag, raise autoscale to **1000 RU/s** during the election day.

### D. Frontend round-trips
- We added a `/api/bootstrap` endpoint that returns **posts + candidates + settings in one call**. The kiosk now loads candidates **once on first render** instead of fetching per category.
- Vercel CDN caches static assets via `vercel.json`.

### E. Gunicorn tuning (already set)
- 4 workers × `uvicorn.workers.UvicornWorker` is correct for App Service B1/B2.
- Keep-alive 5 s lets Vercel reuse TCP connections.

### F. Optional further wins
- Put **Azure Front Door** in front of the API for global edge + free TLS + automatic warm-up pings.
- Use **Cosmos DB free tier** (1000 RU/s + 25 GB free per subscription) if you haven’t.
- Increase `maxPoolSize` to 100 in `server.py` if you expect > 200 concurrent voters.

---

## 5. Auth & redirect behaviour

| Page                        | Auth required? | Behaviour for anonymous user                  |
|-----------------------------|----------------|-----------------------------------------------|
| `/` (home / kiosk)          | No             | Public                                        |
| `/vote`, `/confirm`, `/thank-you` | No        | Public                                        |
| `/board` (notice board)     | No             | Public                                        |
| `/results` (live results)   | **Yes**        | Redirect → `/admin/login?redirect=results`    |
| `/admin/*`                  | **Yes**        | Redirect → `/admin/login?redirect=admin/...`  |

Default seeded admin (one-time, can be changed via DB):
- **Username:** `Aarav`
- **Password:** `Krish@2026`

After logging in, the user is redirected back to the originally requested page automatically.

---

## 6. Troubleshooting

- **CORS error in browser console** → add the exact Vercel domain (with `https://`, no trailing slash) to `CORS_ORIGINS` and **restart the App Service**.
- **`401 Missing token` on `/results`** → expected; you must sign in as admin. Public turnout view is `/board`.
- **First page load slow (5–15 s)** → Azure cold start. Enable **Always On**.
- **`Connection reset by peer` from Cosmos** → make sure connection string ends with `&retrywrites=false`.
