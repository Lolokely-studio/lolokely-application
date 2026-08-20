# Deployment — Render (backend) + Vercel (frontend)

This document is enough to redo the whole deployment from scratch without
rereading the code. Backend on Render (native Python runtime, gunicorn),
frontend on Vercel (static Vite build), database on the existing Supabase
Postgres project.

Design rationale: `docs/superpowers/specs/2026-08-19-deployment-render-vercel-design.md`

## 1. Prerequisites

- A Render account.
- A Vercel account.
- The existing Supabase project (database and credentials).
- The GitHub repository, with the `develop` branch as the production branch
  for both services.

Nothing needs to be installed locally to deploy. To work on the project
locally, see `README.md` and `backend/README.md`.

## 2. Deployment order, and the circular dependency

The two services reference each other: `VITE_API_URL` points at Render, and
`CORS_ORIGINS` points at Vercel. Neither URL exists before its service is
created, so break the cycle in this order:

1. Deploy the backend on Render with a provisional `CORS_ORIGINS`
   (`http://localhost:5173`). The service starts; only browser calls from the
   real frontend would be refused at this point.
2. Note the Render URL: `https://<service>.onrender.com`.
3. Deploy the frontend on Vercel with
   `VITE_API_URL=https://<service>.onrender.com/api`.
4. Note the Vercel URL, go back to Render, set `CORS_ORIGINS` to that URL, and
   redeploy the backend.

Step 4 is not optional: `CORS_ORIGINS` is read at application startup, so
changing it requires a restart to take effect.

## 3. Retrieving the Supabase pooler credentials

Supabase dashboard → **Project Settings** → **Database** → **Connection
string** → **Transaction pooler** tab.

From that connection string, extract:

| Value | Where it goes | Shape |
|---|---|---|
| Host | `DB_HOST` | `aws-0-<region>.pooler.supabase.com` |
| Port | `DB_PORT` | `6543` |
| User | `DB_USER` | `postgres.<project-ref>` |
| Database | `DB_NAME` | `postgres` |
| Password | `DB_PASSWORD` | your database password |

The pooler user is **not** `postgres`. It is `postgres.<project-ref>`, and
using plain `postgres` against port 6543 fails authentication.

Use the pooler (`6543`), not the direct connection (`5432`): Supabase free
allows about 60 direct connections, and gunicorn runs several workers each
holding its own pool.

Transaction mode is safe with psycopg2 — the driver interpolates parameters
client-side and does not use server-side prepared statements by default, which
is the only known incompatibility with that mode.

## 4. Render settings

Create a **Web Service** pointing at the repository.

| Setting | Value |
|---|---|
| Language / Runtime | Python 3 (native runtime, **not** Docker) |
| Root Directory | `backend` |
| Branch | `develop` |
| Build Command | `uv sync --frozen --no-dev` |
| Start Command | `uv run gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class gthread --timeout 120` |
| Health Check Path | `/healthz` |
| Instance Type | Free |

Why each non-obvious flag matters:

- **`--no-dev`** — pytest is declared in the `dev` dependency group. Without
  this flag, uv installs the test framework into the production image.
- **`--timeout 120`** — the gunicorn default is 30 s. The `/api/crm-ai/*`
  routes call NVIDIA models whose latency regularly exceeds that, and the
  worker would be killed mid-generation, returning an error unrelated to the
  real cause.
- **`--worker-class gthread --threads 4`** — those LLM calls are I/O waits.
  Threads absorb them without multiplying processes, which matters on the free
  tier's 512 MB.
- **Python version** — pinned to 3.11.9 by `backend/.python-version`. On
  Python 3.13 the build fails: `psycopg2-binary==2.9.7` has no wheel for it.
  Note that the runtime version is **not** driven by uv (`requires-python` and
  `uv python pin` do not control it), so that file must stay committed.

`/healthz` answers `200 {"status": "ok"}` without touching the database. This
is deliberate: a health check that depends on Supabase would make Render
restart a perfectly healthy backend during a provider outage. For manual
diagnosis, `GET /healthz?db=1` additionally runs `SELECT 1` and returns `503`
with the error message if the database is unreachable.

## 5. Vercel settings

Import the repository as a new project.

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Production Branch | `develop` (not `main`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`frontend/vercel.json` rewrites every route to `/index.html` so that deep
routes such as `/dashboard` resolve through `react-router-dom` instead of
returning a Vercel 404. Static files under `/assets/*` are served before the
rewrite, so only paths with no matching file fall back to the SPA shell.

Set `VITE_API_URL` on **both** the Production and Preview environments. If it
is missing, the build fails with an explicit message (the check lives in
`frontend/vite.config.js`) rather than shipping a broken bundle.

## 6. Environment variables

### Render (backend)

| Variable | Secret | Required | Example / default |
|---|---|---|---|
| `CORS_ORIGINS` | no | **yes** | `https://lolokely.vercel.app` |
| `CORS_ALLOW_VERCEL_PREVIEWS` | no | no | empty; `true` allows every `*.vercel.app` origin |
| `DB_USER` | no | **yes** | `postgres.abcdefghijklm` |
| `DB_PASSWORD` | **yes** | **yes** | your database password |
| `DB_HOST` | no | **yes** | `aws-0-eu-west-3.pooler.supabase.com` |
| `DB_PORT` | no | **yes** | `6543` |
| `DB_NAME` | no | **yes** | `postgres` |
| `DB_POOL_MIN` | no | no | `1` |
| `DB_POOL_MAX` | no | no | `5` — keep it `>=` the gunicorn `--threads` value |
| `SECRET_KEY` | **yes** | **yes** | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_SECRET_KEY` | **yes** | **yes** | generated the same way, different value |
| `JWT_ACCESS_TOKEN_EXPIRES` | no | no | `60` (minutes); `false` = never expires |
| `NVIDIA_API_KEY` | **yes** | for the AI routes | `nvapi-...` |
| `NVIDIA_TEXT_MODELS` | no | no | comma-separated model list |
| `NVIDIA_VISION_MODEL` | no | no | defaults to `google/diffusiongemma-26b-a4b-it` |
| `NVIDIA_TEMPERATURE` | no | no | `1.0` |
| `NVIDIA_TOP_P` | no | no | `1.0` |
| `NVIDIA_MAX_TOKENS` | no | no | `16384` |
| `NVIDIA_SEED` | no | no | `42` |

### Vercel (frontend)

| Variable | Secret | Required | Example |
|---|---|---|---|
| `VITE_API_URL` | no | **yes** | `https://lolokely-api.onrender.com/api` |

Set `VITE_API_URL` on Production **and** Preview. Include the `/api` suffix —
the frontend appends only the route path to it.

### Variables that are *not* needed

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` appear in
`backend/.env.example` but are read by no code in this repository — the backend
talks to Postgres directly through psycopg2, not through the Supabase SDK.
Setting them on Render is unnecessary, and `SUPABASE_SERVICE_ROLE_KEY` in
particular is a full-access credential that is better left unset.

`RENDER` is set by the platform itself. `PORT` is also set by the platform —
see section 8.

## 7. Security

**Anything prefixed `VITE_` is inlined in plaintext into the JavaScript bundle
delivered to the browser.** It is public by construction. Never put a secret
behind that prefix.

`NVIDIA_API_KEY` and, if you ever use it, `SUPABASE_SERVICE_ROLE_KEY` must
exist **only** on Render. That is correct in the current code; the point is
not to break it.

Secret history audit (run 2026-08-20): **clean**. Only `backend/.env.example`
and `frontend/.env.example` have ever been committed. A sweep of the full
history for `nvapi-` keys, JWT-shaped tokens, `SERVICE_ROLE_KEY=` assignments
and password assignments found nothing. **No key rotation is required.**

To re-run that audit after future work:

```bash
git log --all --full-history --oneline -- backend/.env frontend/.env.local
git log --all -p --format="" > /tmp/hist.txt
grep -n '^+.*nvapi-' /tmp/hist.txt | grep -v 'your_key_here'
grep -nE '^\+.*eyJ[A-Za-z0-9_-]{20}' /tmp/hist.txt
rm -f /tmp/hist.txt
```

All commands should return nothing. `.gitignore` ignores `.env*` and
re-allows `.env.example`, but note that a `.gitignore` added after the fact
removes nothing from history — if a real `.env` ever shows up in these
commands, treat those keys as compromised and rotate them.

## 8. The `PORT` trap

`PORT` is reserved by Render for the service's HTTP port — it is what gunicorn
binds to in `--bind 0.0.0.0:$PORT`. It is **not** the Postgres port.

The Postgres port is `DB_PORT`. Never set `PORT` for the database on Render.
`backend/db.py` refuses that configuration explicitly rather than silently
connecting to the wrong port:

```
RuntimeError: DB_PORT must be set on Render (PORT is reserved for the service HTTP port)
```

The legacy names `USER_DB`, `PASSWORD_DB`, `HOST`, `PORT`, `DBNAME` still work
as a local fallback, but do not use them on Render.

## 9. Expected failures and symptoms

| Symptom | Cause | Fix |
|---|---|---|
| First request very slow (~1 min), then normal | Free tier spin-down after 15 min without traffic | Expected. An external pinger avoids it but burns ~744 h of the 750 h/month workspace quota, leaving no room for a second free service |
| `FATAL: too many connections` | `DB_POOL_MAX` × number of workers exceeds the Supabase quota | Lower `DB_POOL_MAX`; confirm you are on the pooler (`DB_PORT=6543`), not the direct connection |
| `PoolError: connection pool exhausted` | `DB_POOL_MAX` lower than the gunicorn thread count | Raise `DB_POOL_MAX` to at least the `--threads` value |
| `RuntimeError: DB_PORT must be set on Render` | `PORT` used for the database | Set `DB_PORT`; see section 8 |
| `RuntimeError: CORS_ORIGINS must be set in the environment` | Variable missing on Render | Set `CORS_ORIGINS`; the backend refuses to start without it, by design |
| 404 when refreshing a deep route | `frontend/vercel.json` missing or not picked up | Confirm the Vercel Root Directory is `frontend` |
| HTML received where JSON is expected | `VITE_API_URL` unset at build time, so axios fell back to relative URLs | Set it on Production **and** Preview, then rebuild |
| Vercel build fails with `VITE_API_URL is not defined` | The variable is genuinely missing | This is the guard working as intended — set the variable |
| CORS errors from a preview deployment | The preview URL is not in `CORS_ORIGINS`, and preview URLs change every deploy | Set `CORS_ALLOW_VERCEL_PREVIEWS=true` on Render, accepting that it allows every `*.vercel.app` origin |
| Render build fails compiling `psycopg2` | Python 3.13 used instead of 3.11.9 | Confirm `backend/.python-version` is committed and the Root Directory is `backend` |
| Worker killed during an AI generation | gunicorn `--timeout` too low | Confirm `--timeout 120` is in the Start Command |
| `pytest` present in production | Build command missing `--no-dev` | Use `uv sync --frozen --no-dev` |
