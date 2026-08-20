# Deployment — Render (backend) + Vercel (frontend)

A step-by-step runbook for deploying this application from scratch. Backend on
Render (native Python runtime, gunicorn), frontend on Vercel (static Vite
build), database on the existing Supabase Postgres project.

Sections 1–5 are the walkthrough, in order. Sections 6–10 are reference: the
full variable table, security notes, the `PORT` trap, troubleshooting, and
routine operations.

Design rationale: `docs/superpowers/specs/2026-08-19-deployment-render-vercel-design.md`

---

## 0. Before you start

### Accounts and access

- A **Render** account with permission to create a Web Service.
- A **Vercel** account with permission to import a project.
- Access to the **Supabase** project (you will need the database password).
- The **GitHub** repository, with both platforms authorized to read it.

### The deployment order matters

The two services reference each other: the frontend needs the backend's URL
(`VITE_API_URL`), and the backend needs the frontend's URL (`CORS_ORIGINS`).
Neither URL exists until its service is created, so the cycle is broken like
this — this is the shape of the whole runbook:

```
1. Supabase   → collect pooler credentials
2. Render     → deploy backend with a PLACEHOLDER CORS_ORIGINS
                → obtain https://<service>.onrender.com
3. Vercel     → deploy frontend with VITE_API_URL = that URL + /api
                → obtain https://<project>.vercel.app
4. Render     → replace CORS_ORIGINS with the Vercel URL, redeploy
5. Verify     → end-to-end
```

Step 4 is not optional. `CORS_ORIGINS` is read once at application startup, so
editing it requires a restart before it takes effect.

### Pre-flight check

Confirm the branch you are deploying is pushed and green:

```bash
cd backend && uv sync --frozen && uv run pytest -q   # expect: 23 passed
cd ../frontend && npm run build                      # expect: ✓ built in ...
cd .. && git status --short                          # expect: clean
git push origin develop
```

Confirm these four files are committed — the deploy depends on each:

```bash
git ls-files backend/uv.lock backend/.python-version backend/wsgi.py frontend/vercel.json
```

All four must be listed. If `backend/uv.lock` is missing, Render will not
detect uv. If `backend/.python-version` is missing, the build fails on
`psycopg2` (see §2). If `backend/wsgi.py` is missing, gunicorn has nothing to
import. If `frontend/vercel.json` is missing, deep routes 404 on refresh.

---

## 1. Supabase — collect the pooler credentials

Supabase dashboard → **Project Settings** → **Database** → **Connection
string** → the **Transaction pooler** tab.

You will see a URI shaped like:

```
postgresql://postgres.abcdefghijklm:[YOUR-PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
             └─────── DB_USER ────┘  └ DB_PASSWORD ┘ └────────── DB_HOST ──────────┘ └DB_PORT┘ └DB_NAME┘
```

Write down the five values — you will paste them into Render in §3:

| Value | Variable | Shape |
|---|---|---|
| User | `DB_USER` | `postgres.<project-ref>` |
| Password | `DB_PASSWORD` | your database password |
| Host | `DB_HOST` | `aws-0-<region>.pooler.supabase.com` |
| Port | `DB_PORT` | `6543` |
| Database | `DB_NAME` | `postgres` |

Two things that cost time if missed:

- **The pooler user is not `postgres`.** It is `postgres.<project-ref>`.
  Plain `postgres` against port 6543 fails authentication.
- **Use the pooler (`6543`), not the direct connection (`5432`).** Supabase
  free allows roughly 60 direct connections; gunicorn runs multiple workers,
  each holding its own pool.

If the password is unknown, reset it on that same page — but note that doing so
breaks any other client using it.

Transaction mode is safe with psycopg2: the driver interpolates parameters
client-side and does not use server-side prepared statements by default, which
is the only known incompatibility with that mode.

---

## 2. Render — create the backend service

Render dashboard → **New** → **Web Service** → connect the repository.

Then set each field. Labels shift occasionally as Render updates its UI; match
on meaning rather than exact wording.

| Field | Value |
|---|---|
| Language / Runtime | **Python 3** — the native runtime, *not* Docker |
| Branch | `develop` |
| Root Directory | `backend` |
| Build Command | `uv sync --frozen --no-dev` |
| Start Command | `uv run --no-dev gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --worker-class gthread --timeout 120` |
| Instance Type | Free |
| Health Check Path | `/healthz` |

**Do not deploy yet** — the environment variables come first (§3). Render will
attempt a first build on creation and that build will fail without them; that is
expected and harmless.

### Why each setting is what it is

- **Root Directory `backend`** — Render treats this as the operational base:
  commands run there, and files outside it are unavailable at build and run
  time. This is what makes `backend/uv.lock` the file that triggers uv
  detection, and `backend/.python-version` the file that sets the runtime.
- **`wsgi:app`, not `app:app`** — `backend/app.py` builds the application only
  under `if __name__ == '__main__'`, so no module-level `app` exists for a WSGI
  server to import. `backend/wsgi.py` exists to provide one.
- **`--no-dev` on *both* commands** — pytest lives in the `dev` dependency
  group. `uv run` re-syncs before executing and includes the dev group by
  default, so putting `--no-dev` only on the build command means pytest gets
  reinstalled at every boot. Verified: after `uv sync --frozen --no-dev`, a
  plain `uv run` reports `Installed 4 packages` and pytest is importable again.
- **`--timeout 120`** — gunicorn defaults to 30 s. The `/api/crm-ai/*` routes
  call NVIDIA models that routinely exceed it; without this the worker is killed
  mid-generation and the client sees an error unrelated to the cause.
- **`--worker-class gthread --threads 4`** — those LLM calls are I/O waits.
  Threads absorb them without multiplying processes, which matters on the free
  tier's 512 MB.
- **Health Check Path `/healthz`** — answers `200 {"status": "ok"}` *without*
  touching the database, deliberately. A health check that depended on Supabase
  would make Render restart a perfectly healthy backend during a provider
  outage. For manual diagnosis, `GET /healthz?db=1` additionally runs `SELECT 1`
  and returns `503` with the error if the database is unreachable.

### The Python version (this is the one that bites)

The build needs **Python 3.11.9**. `psycopg2-binary==2.9.7` publishes no wheel
for 3.13 or 3.14, so a newer runtime tries to compile it from source and the
build fails. Render's default for services created on or after 11 February 2026
is **3.14.3**, so the default is *not* safe here.

`backend/.python-version` (committed, contains `3.11.9`) pins it. For belt and
braces, also set the environment variable in §3:

```
PYTHON_VERSION = 3.11.9
```

That variable takes precedence over the file and must be a fully qualified
version. Note that the runtime version is **not** driven by uv — neither
`requires-python` in `pyproject.toml` nor `uv python pin` controls what Render
installs.

---

## 3. Render — set the environment variables

In the service, open **Environment** and add each variable. §6 has the complete
table with which are secret; this is the minimum to boot.

Generate the two secrets locally first, using a different value for each:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"   # SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"   # JWT_SECRET_KEY
```

Add:

```
CORS_ORIGINS              = http://localhost:5173      ← PLACEHOLDER, replaced in §5
DB_USER                   = postgres.<project-ref>
DB_PASSWORD               = <from §1>
DB_HOST                   = aws-0-<region>.pooler.supabase.com
DB_PORT                   = 6543
DB_NAME                   = postgres
DB_POOL_MIN               = 1
DB_POOL_MAX               = 5
SECRET_KEY                = <generated>
JWT_SECRET_KEY            = <generated, different>
JWT_ACCESS_TOKEN_EXPIRES  = 60
NVIDIA_API_KEY            = nvapi-...
NVIDIA_TEXT_MODELS        = <comma-separated list, or omit for defaults>
PYTHON_VERSION            = 3.11.9
```

Three traps here:

- **Never set `PORT`.** Render owns it for the service's HTTP port, and
  gunicorn binds to it. The Postgres port is `DB_PORT`. See §8.
- **`DB_POOL_MAX` must stay `>=` the gunicorn `--threads` value** (4 in the
  start command above). psycopg2 raises `PoolError` when the pool is exhausted
  rather than waiting for a free connection.
- **`CORS_ORIGINS` is required.** The app raises `RuntimeError` at startup and
  refuses to boot without it — by design, so a misconfiguration surfaces in the
  deploy log rather than as mysterious browser errors later.

Now trigger a deploy (**Manual Deploy** → **Deploy latest commit**).

### Verify the backend before moving on

Watch the deploy log. A healthy build ends with gunicorn boot lines:

```
[INFO] Starting gunicorn 23.0.0
[INFO] Listening at: http://0.0.0.0:10000
[INFO] Using worker: gthread
[INFO] Booting worker with pid: ...
```

Then, from your machine:

```bash
API=https://<your-service>.onrender.com

curl -s -w '\n%{http_code}\n' $API/healthz
# expect: {"status":"ok"} and 200

curl -s -w '\n%{http_code}\n' "$API/healthz?db=1"
# expect: {"db":"ok","status":"ok"} and 200  ← proves Supabase connectivity
```

The first request after idle takes up to a minute (free-tier spin-down, §9).

If `?db=1` returns `503`, the database credentials are wrong — the body carries
the Postgres error. Fix it in Environment before continuing; the frontend cannot
work without it.

**Record the service URL.** You need it in §4.

---

## 4. Vercel — create the frontend project

Vercel dashboard → **Add New** → **Project** → import the repository.

| Field | Value |
|---|---|
| Framework Preset | **Vite** |
| Root Directory | `frontend` |
| Build Command | `npm run build` (preset default) |
| Output Directory | `dist` (preset default) |

Before deploying, add the environment variable under **Environment Variables**,
ticking **Production** *and* **Preview**:

```
VITE_API_URL = https://<your-service>.onrender.com/api
```

Three things to get right:

- **Include the `/api` suffix.** The frontend appends only the route path to
  this value, so omitting it produces 404s on every call.
- **No trailing slash.**
- **Set it on Preview too.** Preview builds otherwise fail — which is the guard
  working, not a bug (below).

Then **Deploy**.

Setting Root Directory to `frontend` also makes `frontend/vercel.json` the
config Vercel reads. That file rewrites every route to `/index.html` so deep
routes like `/dashboard` resolve through `react-router-dom` instead of returning
a Vercel 404. Static files under `/assets/*` are served before the rewrite, so
only paths with no matching file fall back to the SPA shell.

If `VITE_API_URL` is missing, the **build fails** with:

```
Error: VITE_API_URL is not defined. Set it in frontend/.env.local for local dev,
or in the Vercel project settings (Production and Preview) for deploys.
```

That check lives in `frontend/vite.config.js` and is deliberate. Without it the
variable inlines as an empty string, axios falls back to relative URLs, the app
requests the Vercel domain, receives `index.html`, and fails with HTML-where-JSON
errors that point nowhere near the real cause.

`VITE_API_URL` is baked into the bundle at build time. **Changing it later
requires a redeploy** — editing the variable alone changes nothing.

**Record the deployment URL** (`https://<project>.vercel.app`).

---

## 5. Close the loop — point the backend at the frontend

Back on Render → **Environment** → edit `CORS_ORIGINS`:

```
CORS_ORIGINS = https://<project>.vercel.app
```

Replace the placeholder entirely. For several origins, separate with commas and
no spaces:

```
CORS_ORIGINS = https://lolokely.vercel.app,https://www.lolokely.com
```

Saving triggers a redeploy. Wait for it — the value is read at startup only.

### Optional: preview deployments

Vercel gives every branch a fresh preview URL, so previews cannot be listed in
advance. To let them call the API:

```
CORS_ALLOW_VERCEL_PREVIEWS = true
```

This allows **every** `*.vercel.app` origin, which is why it is off by default.
Enable it knowingly, or leave it off and accept that previews cannot reach the
backend.

### End-to-end verification

```bash
API=https://<your-service>.onrender.com
APP=https://<project>.vercel.app

# 1. backend alive and database reachable
curl -s "$API/healthz?db=1"
# expect: {"db":"ok","status":"ok"}

# 2. CORS allows the real frontend
curl -s -I -X OPTIONS $API/api/auth/login \
  -H "Origin: $APP" -H 'Access-Control-Request-Method: POST' \
  | grep -i access-control-allow-origin
# expect: Access-Control-Allow-Origin: https://<project>.vercel.app

# 3. CORS rejects anything else
curl -s -I -X OPTIONS $API/api/auth/login \
  -H 'Origin: https://evil.example.com' -H 'Access-Control-Request-Method: POST' \
  | grep -ci access-control-allow-origin
# expect: 0

# 4. deep route serves the SPA instead of 404
curl -s -o /dev/null -w '%{http_code}\n' $APP/dashboard
# expect: 200

# 5. login works through the deployed stack
curl -s -o /dev/null -w '%{http_code}\n' -X POST $API/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<user>","password":"<password>"}'
# expect: 200
```

Then open `$APP` in a browser, sign in, and reload once on a deep route such as
`/crm`. Check the browser console for CORS errors — that is where a wrong
`CORS_ORIGINS` shows up, not in the Render log.

---

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
| Render build fails compiling `psycopg2` | Runtime newer than 3.11 — Render now defaults to 3.14.3 | Confirm `backend/.python-version` is committed and Root Directory is `backend`; set `PYTHON_VERSION=3.11.9` to be certain |
| Worker killed during an AI generation | gunicorn `--timeout` too low | Confirm `--timeout 120` is in the Start Command |
| `pytest` present in production | `--no-dev` missing from the **start** command, not just the build | Both commands need it — `uv run` re-syncs with the dev group by default |

---

## 10. Routine operations

### Redeploying

Both platforms auto-deploy on push to their production branch (`develop`).
Manual redeploys: Render → **Manual Deploy** → **Deploy latest commit**;
Vercel → **Deployments** → pick a deployment → **Redeploy**.

Two changes need a **rebuild**, not just a variable edit:

- `VITE_API_URL` — inlined into the bundle at build time.
- Any dependency change — commit the updated `backend/uv.lock`, or the build
  fails on `uv sync --frozen`.

One change needs a **restart**: `CORS_ORIGINS`, read once at startup. Saving it
on Render triggers a redeploy, which covers it.

### Rolling back

- **Render** → **Events** / **Deploys** → select the last good deploy → **Rollback**.
- **Vercel** → **Deployments** → select the last good one → **Promote to Production**.

Neither rolls back the database. This deployment introduces no migrations, so
rolling back code alone is safe here.

### Changing a dependency

```bash
cd backend
# edit pyproject.toml, then:
uv lock
uv sync --frozen
uv run pytest -q          # confirm nothing broke
git add pyproject.toml uv.lock && git commit -m "build: bump <package>"
```

The deploy runs `uv sync --frozen`, which installs exactly what the lockfile
pins and fails rather than silently re-resolving. An uncommitted `uv.lock` is
the most common cause of "works locally, fails on Render".

### Rotating a secret

Update it on Render → **Environment** and save; the redeploy picks it up.
Rotating `JWT_SECRET_KEY` invalidates every issued token and signs all users
out — expected, but do it deliberately.

### Living with the free tier

- The backend sleeps after 15 minutes without inbound traffic; the next request
  pays roughly a minute of cold start.
- The workspace allowance is 750 instance-hours per month. A service kept awake
  continuously consumes about 744, leaving no room for a second free service.
  Treat an uptime pinger as a trade-off, not a default.
- Supabase free caps direct connections at roughly 60 — the reason for using
  the pooler in §1.
